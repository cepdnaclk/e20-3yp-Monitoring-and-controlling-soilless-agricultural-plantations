import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

export const initializeGroupDefaults = async (userId, groupId, deviceId = null) => {
  console.log(`🔧 Starting initialization for group: ${groupId}`);
  console.log(`📱 DeviceId provided: ${deviceId}`); // Add this debug log
  
  const subcollectionsToInit = [
    {
      collection: "active_commands",
      docId: "init",
      data: { 
        createdAt: serverTimestamp(), 
        status: "init",
        placeholder: true 
      }
    },
    {
      collection: "alerts", 
      docId: "init",
      data: { 
        createdAt: serverTimestamp(), 
        status: "init",
        placeholder: true 
      }
    },
    {
      collection: "control_settings",
      docId: "1", // Main config
      data: {
        createdAt: serverTimestamp(),
        pHTarget: 7.0,
        ecTarget: 5.0,
        soilMoistureTarget: 10,
        tempTarget: 25.0,
        humidityTarget: 30,
        mode: "auto"
      }
    },
    {
      collection: "stop_commands",
      docId: "init",
      data: { 
        createdAt: serverTimestamp(), 
        status: "init",
        placeholder: true 
      }
    },
    {
      collection: "sensor_data",
      docId: "1", // Latest reading
      data: {
        ec: 5.0,
        humidity: 30,
        light_intensity: 2000,
        ph: 7.0,
        soil_moisture: 10,
        temperature: 25.0,
        water_level: "normal",
        timestamp: serverTimestamp(),
        initialized: true
      }
    }
  ];

  const results = {
    success: [],
    errors: [],
    skipped: []
  };

  try {
    // Group-level initialization
    for (const subcollection of subcollectionsToInit) {
      try {
        const docPath = `users/${userId}/deviceGroups/${groupId}/${subcollection.collection}/${subcollection.docId}`;
        console.log(`📝 Attempting to create: ${docPath}`);
        
        const docRef = doc(db, docPath);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          await setDoc(docRef, subcollection.data);
          console.log(`✅ Created: ${subcollection.collection}/${subcollection.docId}`);
          results.success.push(docPath);
        } else {
          console.log(`⚠️ Already exists: ${subcollection.collection}/${subcollection.docId}`);
          results.skipped.push(docPath);
        }
      } catch (subcollectionError) {
        console.error(`❌ Error creating ${subcollection.collection}:`, subcollectionError);
        results.errors.push({
          collection: subcollection.collection,
          error: subcollectionError.message
        });
      }
    }

    // Device-level commands under group path - Fixed condition check
    if (deviceId && deviceId !== null && deviceId !== '') {
      console.log(`🔧 Initializing device commands for: ${deviceId} under group: ${groupId}`);
      
      const deviceCommands = [
        {
          path: `users/${userId}/deviceGroups/${groupId}/devices/${deviceId}/active_commands/init`,
          data: {
            createdAt: serverTimestamp(),
            status: "init",
            placeholder: true
          }
        },
        {
          path: `users/${userId}/deviceGroups/${groupId}/devices/${deviceId}/stop_commands/init`,
          data: {
            createdAt: serverTimestamp(),
            status: "init",
            placeholder: true
          }
        }
      ];

      for (const { path, data } of deviceCommands) {
        try {
          console.log(`📱 Attempting to create device command: ${path}`); // Add debug log
          const docRef = doc(db, path);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            await setDoc(docRef, data);
            console.log(`✅ Created: ${path}`);
            results.success.push(path);
          } else {
            console.log(`⚠️ Skipped (exists): ${path}`);
            results.skipped.push(path);
          }
        } catch (deviceError) {
          console.error(`❌ Error creating ${path}:`, deviceError);
          results.errors.push({ path, error: deviceError.message });
        }
      }
    } else {
      console.log(`⚠️ No deviceId provided, skipping device-level initialization`);
    }

    console.log(`✅ Initialization completed for group: ${groupId}`);
    console.log(`   - Success: ${results.success.length}`);
    console.log(`   - Skipped: ${results.skipped.length}`);
    console.log(`   - Errors: ${results.errors.length}`);

    return {
      success: results.errors.length === 0,
      results
    };

  } catch (fatalError) {
    console.error("🔥 Fatal error during group/device initialization:", fatalError);
    throw fatalError;
  }
};