import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

export const initializeGroupDefaults = async (userId, groupId) => {
  console.log(`🔧 Starting initialization for group: ${groupId}`);
  
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
      docId: "1", // This should be the main settings document
      data: {
        createdAt: serverTimestamp(),
        pHTarget: 6.5,
        ecTarget: 2.0,
        soilMoistureTarget: 50,
        tempTarget: 24,
        humidityTarget: 60,
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
      docId: "latest", // Use a consistent document ID for latest sensor data
      data: {
        ec: 0.0,
        humidity: 0,
        light_intensity: 0,
        ph: 7.0,
        soil_moisture: 0,
        temperature: 0.0,
        water_level: "unknown",
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
    for (const subcollection of subcollectionsToInit) {
      try {
        const docPath = `users/${userId}/deviceGroups/${groupId}/${subcollection.collection}/${subcollection.docId}`;
        console.log(`📝 Attempting to create: ${docPath}`);
        
        const docRef = doc(db, docPath);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          await setDoc(docRef, subcollection.data);
          console.log(`✅ Created: ${subcollection.collection}/${subcollection.docId}`);
          results.success.push(subcollection.collection);
        } else {
          console.log(`⚠️ Already exists: ${subcollection.collection}/${subcollection.docId}`);
          results.skipped.push(subcollection.collection);
        }
      } catch (subcollectionError) {
        console.error(`❌ Error creating ${subcollection.collection}:`, subcollectionError);
        results.errors.push({
          collection: subcollection.collection,
          error: subcollectionError.message
        });
      }
    }

    console.log(`✅ Group initialization completed for ${groupId}:`);
    console.log(`   - Success: ${results.success.length} collections`);
    console.log(`   - Skipped: ${results.skipped.length} collections`);
    console.log(`   - Errors: ${results.errors.length} collections`);

    if (results.errors.length > 0) {
      console.error("❌ Initialization errors:", results.errors);
    }

    return {
      success: results.errors.length === 0,
      results
    };

  } catch (error) {
    console.error("🔥 Fatal error during group initialization:", error);
    throw error;
  }
};

// Alternative function to create all subcollections at once with batch writes
export const initializeGroupDefaultsBatch = async (userId, groupId) => {
  console.log(`🔧 Starting BATCH initialization for group: ${groupId}`);
  
  try {
    const subcollections = [
      { path: `active_commands/init`, data: { createdAt: serverTimestamp(), status: "init", placeholder: true } },
      { path: `alerts/init`, data: { createdAt: serverTimestamp(), status: "init", placeholder: true } },
      { path: `control_settings/1`, data: { createdAt: serverTimestamp(), pHTarget: 6.5, ecTarget: 2.0, soilMoistureTarget: 50, tempTarget: 24, humidityTarget: 60, mode: "auto" } },
      { path: `stop_commands/init`, data: { createdAt: serverTimestamp(), status: "init", placeholder: true } },
      { path: `sensor_data/latest`, data: { ec: 0.0, humidity: 0, light_intensity: 0, ph: 7.0, soil_moisture: 0, temperature: 0.0, water_level: "unknown", timestamp: serverTimestamp(), initialized: true } }
    ];

    // Create all documents
    const promises = subcollections.map(async ({ path, data }) => {
      const fullPath = `users/${userId}/deviceGroups/${groupId}/${path}`;
      const docRef = doc(db, fullPath);
      
      // Check if document exists first
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, data);
        console.log(`✅ Created: ${path}`);
        return { path, status: 'created' };
      } else {
        console.log(`⚠️ Skipped (exists): ${path}`);
        return { path, status: 'skipped' };
      }
    });

    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Batch initialization completed: ${successful} successful, ${failed} failed`);
    
    return {
      success: failed === 0,
      successful,
      failed,
      results
    };

  } catch (error) {
    console.error("🔥 Fatal error during batch initialization:", error);
    throw error;
  }
};