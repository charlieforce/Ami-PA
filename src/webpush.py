#!/usr/bin/env python3
"""Sending a push notification, written out by hand.

The usual library (pywebpush) depends on http-ece, which will not build on
Python 3.14. The encryption itself is a published standard (RFC 8291) and
the cryptography library already on this machine does all the hard parts, so
this does it directly.

Nothing here is clever. It follows the spec step by step:
  - make a one-off keypair
  - agree a shared secret with the browser's key
  - derive a content key and nonce from it
  - encrypt the message with AES-GCM
  - sign a token saying who is sending it (VAPID)

Save as  webpush.py  in the src folder.
"""
import base64, json, os, struct, time
from urllib.parse import urlparse

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, utils as asym_utils
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF


def _b64(data):
    """base64url, no padding - what the push protocol uses throughout."""
    if isinstance(data, str):
        data = data.encode()
    return base64.urlsafe_b64encode(data).decode().rstrip('=')


def _unb64(s):
    s = s + '=' * (-len(s) % 4)
    return base64.urlsafe_b64decode(s)


def _hkdf(salt, ikm, info, length):
    return HKDF(algorithm=hashes.SHA256(), length=length,
                salt=salt, info=info).derive(ikm)


def encrypt(payload, p256dh, auth):
    """Encrypt a message for one browser. Returns the body to POST.

    p256dh and auth come from the browser when it subscribes.
    """
    if isinstance(payload, str):
        payload = payload.encode()

    client_pub_bytes = _unb64(p256dh)
    auth_secret = _unb64(auth)

    client_pub = ec.EllipticCurvePublicKey.from_encoded_point(
        ec.SECP256R1(), client_pub_bytes)

    # a fresh keypair for this one message
    server_key = ec.generate_private_key(ec.SECP256R1())
    server_pub_bytes = server_key.public_key().public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.UncompressedPoint)

    shared = server_key.exchange(ec.ECDH(), client_pub)

    # the browser and the server derive the same key from the same pieces
    salt = os.urandom(16)
    info = (b"WebPush: info\x00" + client_pub_bytes + server_pub_bytes)
    prk = _hkdf(auth_secret, shared, info, 32)

    content_key = _hkdf(salt, prk, b"Content-Encoding: aes128gcm\x00", 16)
    nonce = _hkdf(salt, prk, b"Content-Encoding: nonce\x00", 12)

    # the record ends with a 0x02 delimiter, then is encrypted whole
    aesgcm = AESGCM(content_key)
    ciphertext = aesgcm.encrypt(nonce, payload + b"\x02", None)

    # header: salt, record size, key length, the key itself
    header = (salt
              + struct.pack("!L", 4096)
              + struct.pack("!B", len(server_pub_bytes))
              + server_pub_bytes)
    return header + ciphertext


def vapid_headers(endpoint, private_key_pem_path, subject="mailto:ami@localhost"):
    """The token that says who is sending this. Valid for 12 hours."""
    with open(private_key_pem_path, 'rb') as fh:
        key = serialization.load_pem_private_key(fh.read(), password=None)

    parts = urlparse(endpoint)
    aud = parts.scheme + "://" + parts.netloc

    header = _b64(json.dumps({"typ": "JWT", "alg": "ES256"}, separators=(',', ':')))
    claims = _b64(json.dumps({"aud": aud,
                              "exp": int(time.time()) + 12 * 3600,
                              "sub": subject}, separators=(',', ':')))
    signing_input = (header + "." + claims).encode()

    der = key.sign(signing_input, ec.ECDSA(hashes.SHA256()))
    r, s = asym_utils.decode_dss_signature(der)
    raw_sig = r.to_bytes(32, 'big') + s.to_bytes(32, 'big')

    token = header + "." + claims + "." + _b64(raw_sig)

    pub = key.public_key().public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.UncompressedPoint)

    return {"Authorization": "vapid t=" + token + ", k=" + _b64(pub)}


def send(subscription, payload, private_key_pem_path, ttl=3600,
         subject="mailto:ami@localhost", urgency=None):
    """Send one notification. Returns (ok, status, text)."""
    import urllib.request, urllib.error

    endpoint = subscription['endpoint']
    keys = subscription.get('keys') or {}
    body = encrypt(payload, keys['p256dh'], keys['auth'])

    headers = {
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        "TTL": str(ttl),
    }
    headers.update(vapid_headers(endpoint, private_key_pem_path, subject))
    if urgency:
        headers["Urgency"] = urgency

    req = urllib.request.Request(endpoint, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return True, r.status, ""
    except urllib.error.HTTPError as e:
        return False, e.code, e.read().decode(errors='ignore')[:200]
    except Exception as e:
        return False, 0, str(e)[:200]


def public_key(private_key_pem_path):
    """The key the browser needs when it subscribes."""
    with open(private_key_pem_path, 'rb') as fh:
        key = serialization.load_pem_private_key(fh.read(), password=None)
    raw = key.public_key().public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.UncompressedPoint)
    return _b64(raw)


def make_keys(path):
    """Once, at the start. Losing this means every device must subscribe again."""
    if os.path.exists(path):
        return public_key(path)
    key = ec.generate_private_key(ec.SECP256R1())
    pem = key.private_bytes(serialization.Encoding.PEM,
                            serialization.PrivateFormat.PKCS8,
                            serialization.NoEncryption())
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    with open(path, 'wb') as fh:
        fh.write(pem)
    return public_key(path)


if __name__ == '__main__':
    pub = make_keys('data/vapid_private.pem')
    print("public key: " + pub)
    # prove the encryption runs end to end against a throwaway browser key
    client = ec.generate_private_key(ec.SECP256R1())
    p256dh = _b64(client.public_key().public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint))
    auth = _b64(os.urandom(16))
    blob = encrypt(b'{"title":"test"}', p256dh, auth)
    print("encrypted a test message: " + str(len(blob)) + " bytes")
    h = vapid_headers("https://web.push.apple.com/abc", 'data/vapid_private.pem')
    print("signed a token: " + h['Authorization'][:46] + "...")
