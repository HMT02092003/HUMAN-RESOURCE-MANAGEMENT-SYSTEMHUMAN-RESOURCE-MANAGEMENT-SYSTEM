import React from 'react';
import BusinessTripApplicationScreen from './BusinessTripApplicationScreen';

// Màn tạo mới - KHÔNG bao giờ load data từ API
const BusinessTripApplicationCreateScreen = ({ navigation, route: _ignoredRoute }) => {
  // Force route params để đảm bảo luôn là create mode và không có applicationId
  const route = { 
    params: { 
      mode: 'create', 
      applicationId: undefined, 
      applicationData: undefined 
    } 
  };
  return <BusinessTripApplicationScreen navigation={navigation} route={route} />;
};

export default BusinessTripApplicationCreateScreen;
