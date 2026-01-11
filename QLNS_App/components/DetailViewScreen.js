/**
 * ============================================
 * DETAIL VIEW SCREEN COMPONENT
 * ============================================
 * 
 * Component hiển thị chi tiết read-only cho các đối tượng:
 * - Hiển thị dữ liệu dạng sections/cards
 * - Không có input fields (chỉ xem)
 * - Có thể thêm actions (Edit, Delete, Approve, etc.)
 * 
 * Props:
 * - title: string - Tiêu đề màn hình
 * - sections: array of { title, fields: [{ label, value, icon, type, render }] }
 * - actions: array of { label, icon, color, onPress, visible }
 * - loading: boolean
 * - onBack: function
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import {
  Surface,
  Text,
  Divider,
  useTheme,
  Button,
  Chip
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const DetailViewScreen = ({
  title,
  sections = [],
  actions = [],
  loading = false,
  onBack,
  headerRight
}) => {
  const theme = useTheme();

  // Format value based on type
  const formatValue = (value, type) => {
    if (!value && value !== 0) return 'N/A';
    
    switch (type) {
      case 'date':
        return new Date(value).toLocaleDateString('vi-VN');
      case 'datetime':
        return new Date(value).toLocaleString('vi-VN');
      case 'boolean':
        return value ? 'Có' : 'Không';
      case 'status':
        return value;
      case 'currency':
        return new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND'
        }).format(value);
      default:
        return String(value);
    }
  };

  // Render field based on type
  const renderField = (field) => {
    if (field.render) {
      return field.render(field.value);
    }

    if (field.type === 'chip') {
      return (
        <Chip
          mode="outlined"
          style={[styles.chip, field.chipStyle]}
          textStyle={field.chipTextStyle}
        >
          {formatValue(field.value, field.type)}
        </Chip>
      );
    }

    return (
      <Text style={[styles.fieldValue, field.valueStyle]}>
        {formatValue(field.value, field.type)}
      </Text>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#262626" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerRightContainer}>
            {headerRight}
          </View>
        </View>
      </Surface>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {sections.map((section, sectionIndex) => (
          <Surface key={sectionIndex} style={styles.section} elevation={1}>
            {section.title && (
              <View style={styles.sectionHeader}>
                {section.icon && (
                  <MaterialCommunityIcons
                    name={section.icon}
                    size={20}
                    color={theme.colors.primary}
                    style={styles.sectionIcon}
                  />
                )}
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
            )}

            {section.fields?.map((field, fieldIndex) => (
              <View key={fieldIndex}>
                {fieldIndex > 0 && <Divider style={styles.fieldDivider} />}
                <View style={styles.fieldRow}>
                  <View style={styles.fieldLabelContainer}>
                    {field.icon && (
                      <MaterialCommunityIcons
                        name={field.icon}
                        size={18}
                        color="#8c8c8c"
                        style={styles.fieldIcon}
                      />
                    )}
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                  </View>
                  <View style={styles.fieldValueContainer}>
                    {renderField(field)}
                  </View>
                </View>
              </View>
            ))}
          </Surface>
        ))}

        {/* Actions */}
        {actions.length > 0 && (
          <View style={styles.actionsContainer}>
            {actions
              .filter(action => action.visible !== false)
              .map((action, index) => (
                <Button
                  key={index}
                  mode={action.mode || 'contained'}
                  onPress={action.onPress}
                  icon={action.icon}
                  style={[
                    styles.actionButton,
                    action.buttonStyle
                  ]}
                  labelStyle={action.labelStyle}
                  buttonColor={action.color}
                >
                  {action.label}
                </Button>
              ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8c8c8c'
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginHorizontal: 12
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  content: {
    flex: 1
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  sectionIcon: {
    marginRight: 8
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626'
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12
  },
  fieldDivider: {
    backgroundColor: '#f0f0f0'
  },
  fieldLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '40%',
    paddingRight: 12
  },
  fieldIcon: {
    marginRight: 6
  },
  fieldLabel: {
    fontSize: 14,
    color: '#8c8c8c',
    fontWeight: '500'
  },
  fieldValueContainer: {
    flex: 1,
    alignItems: 'flex-start'
  },
  fieldValue: {
    fontSize: 14,
    color: '#262626',
    lineHeight: 20
  },
  chip: {
    alignSelf: 'flex-start'
  },
  actionsContainer: {
    marginHorizontal: 16,
    marginTop: 20,
    gap: 12
  },
  actionButton: {
    borderRadius: 8
  },
  bottomPadding: {
    height: 32
  }
});

export default DetailViewScreen;
