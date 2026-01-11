import React from 'react';
import OvertimeApplicationScreen from './OvertimeApplicationScreen';

// Màn tạo mới - KHÔNG bao giờ load data từ API
const OvertimeApplicationCreateScreen = ({ navigation, route: _ignoredRoute }) => {
  // Force route params để đảm bảo luôn là create mode và không có applicationId
  const route = { 
    params: { 
      mode: 'create', 
      applicationId: undefined, 
      applicationData: undefined 
    } 
  };
  return <OvertimeApplicationScreen navigation={navigation} route={route} />;
};

export default OvertimeApplicationCreateScreen;
