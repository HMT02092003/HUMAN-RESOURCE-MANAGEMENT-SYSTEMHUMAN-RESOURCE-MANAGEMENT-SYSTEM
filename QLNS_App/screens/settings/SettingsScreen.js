import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView
} from 'react-native';

const SettingsScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cài đặt hệ thống</Text>
        <Text style={styles.headerSubtitle}>Cấu hình và quản lý cài đặt hệ thống</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Thiết lập hệ thống</Text>
        
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Cài đặt chung</Text>
          </View>
          <Text style={styles.cardContent}>Cấu hình cài đặt chung của hệ thống</Text>
        </View>
        
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Bảo mật</Text>
          </View>
          <Text style={styles.cardContent}>Cài đặt bảo mật và quyền riêng tư</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cardContent: {
    fontSize: 14,
    color: '#666',
  },
});

export default SettingsScreen;