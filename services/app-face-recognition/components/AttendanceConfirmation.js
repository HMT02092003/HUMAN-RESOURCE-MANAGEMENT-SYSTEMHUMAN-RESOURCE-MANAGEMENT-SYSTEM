import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function AttendanceConfirmation({ 
  imageUri, 
  attendanceData, 
  onRetake, 
  onConfirm 
}) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Xác nhận chấm công</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.capturedImage} />
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={24} color="#007AFF" />
            <Text style={styles.infoLabel}>Nhân viên:</Text>
            <Text style={styles.infoValue}>{attendanceData.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time" size={24} color="#007AFF" />
            <Text style={styles.infoLabel}>Thời gian:</Text>
            <Text style={styles.infoValue}>{attendanceData.time}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={24} color="#007AFF" />
            <Text style={styles.infoLabel}>Ngày:</Text>
            <Text style={styles.infoValue}>{attendanceData.date}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location" size={24} color="#007AFF" />
            <Text style={styles.infoLabel}>Vị trí:</Text>
            <Text style={styles.infoValue}>{attendanceData.location}</Text>
          </View>
        </View>

        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>
            Thông tin có chính xác không?
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.retakeButton} onPress={onRetake}>
          <Ionicons name="camera" size={20} color="#FF3B30" />
          <Text style={styles.retakeButtonText}>Chụp lại</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
          <Ionicons name="checkmark" size={20} color="white" />
          <Text style={styles.confirmButtonText}>Xác nhận</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  capturedImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  infoContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 10,
    minWidth: 80,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  questionContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1976d2',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FF3B30',
    minWidth: 120,
    justifyContent: 'center',
  },
  retakeButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 120,
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});