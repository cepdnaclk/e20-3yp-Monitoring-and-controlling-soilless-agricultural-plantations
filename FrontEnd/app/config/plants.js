const plantations = [
  {
    id: 1,
    name: 'Lettuce Hydroponic Bed',
    crop: 'Lettuce',
    price: '20.00',
    like: true,
    img: require('../plants/plant1.jpg'), 
    about:
      'A hydroponic lettuce plantation using the Nutrient Film Technique (NFT). This method ensures continuous nutrient flow and optimal growth conditions.',
  },

  {
    id: 2,
    name: 'Tomato Vertical Tower',
    crop: 'Tomatoes',
    price: '35.00',
    like: false,
    img: require('../plants/plant2.jpg'), 
    about:
      'A vertical hydroponic tomato farm utilizing a drip irrigation system. Designed for space efficiency and steady nutrient delivery for high yields.',
  },
  {
    id: 3,
    name: 'Basil Deep Water Culture',
    crop: 'Basil',
    price: '18.99',
    like: false,
    img: require('../plants/plant3.jpg'), 
    about:
      'Basil plantation grown in a Deep Water Culture (DWC) system, providing oxygen-rich and nutrient-balanced water for rapid and healthy growth.',
  },

  {
    id: 4,
    name: 'Spinach Floating Raft System',
    crop: 'Spinach',
    price: '22.99',
    like: true,
    img: require('../plants/plant10.png'), 
    about:
      'A spinach plantation using a floating raft hydroponic system. This ensures consistent nutrient absorption and pesticide-free, high-yield crops.',
  },
  {
    id: 5,
    name: 'Strawberry Aeroponic System',
    crop: 'Strawberries',
    price: '50.00',
    like: true,
    img: require('../plants/plant8.png'), 
    about:
      'An aeroponic strawberry plantation designed for maximum oxygenation and water efficiency, leading to faster growth and superior fruit quality.',
  },
  {
    id: 6,
    name: 'Pepper Dutch Bucket System',
    crop: 'Bell Peppers',
    price: '45.99',
    like: false,
    img: require('../plants/plant7.png'), 
    about:
      'A Dutch bucket hydroponic system optimized for bell peppers. Provides controlled nutrient delivery and optimal growth conditions.',
  },
];

export default plantations;
