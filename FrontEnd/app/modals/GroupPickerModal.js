import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet, TextInput } from 'react-native';
import { getFirestore, collection, getDocs, setDoc, doc, onSnapshot } from 'firebase/firestore';
export default function GroupPickerModal({ visible, userId, onSelectGroup, onClose }) {
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const db = getFirestore();

  useEffect(() => {
  if (!userId) return;

  const groupRef = collection(db, 'users', userId, 'deviceGroups');

  const unsubscribe = onSnapshot(groupRef, (snapshot) => {
    const updatedGroups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setGroups(updatedGroups);
  });

  return () => unsubscribe(); // ✅ clean up on modal close or unmount
}, [userId]);


  const createGroup = async () => {
  if (!newGroupName.trim()) return;

  const groupRef = collection(db, 'users', userId, 'deviceGroups');
  const snapshot = await getDocs(groupRef);
  const existingIds = snapshot.docs.map(doc => doc.id);

  // Find next available group letter
  let nextLetter = 'A';
  while (existingIds.includes(`group_${nextLetter}`)) {
    nextLetter = String.fromCharCode(nextLetter.charCodeAt(0) + 1);
  }

  const customGroupId = `group_${nextLetter}`;

  const newGroup = {
    name: newGroupName,
    description: '',
    sensorUnitIds: [],
    controllerUnitIds: [],
    createdAt: new Date().toISOString(),
  };

  // ✅ Set the doc with custom ID
  await setDoc(doc(db, 'users', userId, 'deviceGroups', customGroupId), newGroup);

  onSelectGroup(customGroupId);
};


  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>Assign to Group</Text>

        <FlatList
          data={groups}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => onSelectGroup(item.id)} style={styles.item}>
              <Text style={styles.text}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />

        <TextInput
          placeholder="New Group Name"
          value={newGroupName}
          onChangeText={setNewGroupName}
          style={styles.input}
        />
        <TouchableOpacity onPress={createGroup} style={styles.addButton}>
          <Text style={styles.addText}>+ Create New Group</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  item: { padding: 15, borderBottomWidth: 1, borderColor: '#ccc' },
  text: { fontSize: 18 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginVertical: 10 },
  addButton: { backgroundColor: '#2D6A4F', padding: 12, borderRadius: 8, alignItems: 'center' },
  addText: { color: '#fff', fontWeight: 'bold' },
  cancelButton: { marginTop: 10, alignItems: 'center' },
  cancelText: { color: 'red' },
});
