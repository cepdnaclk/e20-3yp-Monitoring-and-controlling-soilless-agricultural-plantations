const devices = [
    {
      id: '1',
      name: 'Monitoring Unit',
      type: 'Sensor Hub',
      status: 'Active',
      img: require('../devices/device1.png'), 
      description:
        'A central monitoring unit that collects and processes data from multiple sensors to provide real-time insights into the hydroponic system.',
    },
  
    {
      id: '2',
      name: 'Sensor Unit',
      type: 'Environmental Sensor',
      status: 'Inactive',
      img: require('../devices/device1.png'), 
      description:
        'A multi-parameter sensor unit capable of measuring temperature, humidity, pH, and nutrient levels to ensure optimal plant growth conditions.',
    },
    
    {
      id: '3',
      name: 'Controller Unit',
      type: 'Automation Module',
      status: 'Active',
      img: require('../devices/device2.jpg'), 
      description:
        'An intelligent controller that automates water and nutrient delivery, optimizing resource usage and plant health.',
    },
  ];
  
  export default devices;
  