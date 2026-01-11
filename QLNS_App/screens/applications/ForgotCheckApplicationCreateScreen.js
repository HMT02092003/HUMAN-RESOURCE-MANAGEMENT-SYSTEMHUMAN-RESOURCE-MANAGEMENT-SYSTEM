import React from 'react';
import ForgotCheckApplicationScreen from './ForgotCheckApplicationScreen';

// Màn tạo mới - KHÔNG bao giờ load data từ API
const ForgotCheckApplicationCreateScreen = ({ navigation, route: _ignoredRoute }) => {
  // Force route params để đảm bảo luôn là create mode và không có applicationId
  const route = { 
    params: { 
      mode: 'create', 
      applicationId: undefined, 
      applicationData: undefined 
    } 
  };
  return <ForgotCheckApplicationScreen navigation={navigation} route={route} />;
};

export default ForgotCheckApplicationCreateScreen;
