const ADJECTIVES = ['Calm','Gentle','Quiet','Brave','Warm','Kind','Soft','Still','Bold','Clear','Bright','Deep','Free','True','Pure','Swift'];
const ANIMALS = ['Panda','Elephant','Deer','Owl','Fox','Rabbit','Turtle','Sparrow','Dolphin','Tiger','Crane','Otter','Eagle','Lynx','Wolf','Bear'];

export const generateAnonId = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj} ${animal} #${num}`;
};

export const getOrCreateAnonId = () => {
  let id = localStorage.getItem('anonthera_anon_id');
  if (!id) {
    id = generateAnonId();
    localStorage.setItem('anonthera_anon_id', id);
  }
  return id;
};
