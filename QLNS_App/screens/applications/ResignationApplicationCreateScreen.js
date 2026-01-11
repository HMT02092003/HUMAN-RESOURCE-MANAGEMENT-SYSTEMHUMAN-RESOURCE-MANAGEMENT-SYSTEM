import React from 'react';
import ResignationApplicationScreen from './ResignationApplicationScreen';

// Màn tạo mới - KHÔNG bao giờ load data từ API
const ResignationApplicationCreateScreen = ({ navigation, route: _ignoredRoute }) => {
  // Force route params để đảm bảo luôn là create mode và không có applicationId
  const route = { 
    params: { 
      mode: 'create', 
      applicationId: undefined, 
      applicationData: undefined 
    } 
  };
  return <ResignationApplicationScreen navigation={navigation} route={route} />;
};

export default ResignationApplicationCreateScreen;
