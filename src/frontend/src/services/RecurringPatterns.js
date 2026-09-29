export const parseRecurring = (transcript) => {
  const text = transcript.toLowerCase();
  
  if (/every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(text)) {
    return 'weekly';
  }
  if (/every\s+(\d+)\s*weeks?/i.test(text)) {
    const match = text.match(/every\s+(\d+)\s*weeks?/i);
    return `every_${match[1]}_weeks`;
  }
  if (/biweekly|bi\s*weekly|every\s+two\s+weeks/i.test(text)) {
    return 'every_2_weeks';
  }
  if (/every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+and\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(text)) {
    return 'twice_weekly';
  }
  if (/daily|every\s+day/i.test(text)) {
    return 'daily';
  }
  if (/monthly|every\s+month/i.test(text)) {
    return 'monthly';
  }
  
  return 'none';
};
