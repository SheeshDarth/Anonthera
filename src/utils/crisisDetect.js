const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end my life', 'want to die', 'better off dead',
  'hurt myself', 'self harm', 'cut myself', 'not worth living',
  'end it all', 'no reason to live', 'can\'t go on', 'give up on life',
  'overdose', 'stop breathing', 'not be here anymore', 'disappear forever',
  'icall', 'vandrevala', 'helpline',
];

export const detectCrisis = (text) => {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
};
