import React, { useContext } from 'react';
import { DefaultTheme, NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import AdminNavigator from './AdminNavigator';
import { COLORS } from '../constants/colors';
import SplashScreen from '../components/SplashScreen';

const AppNavigator = () => {
  const { user, loading, isAdmin } = useContext(AuthContext);
  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationIndependentTree>
      <NavigationContainer theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: COLORS.primary, background: COLORS.background, card: COLORS.surface, text: COLORS.text, border: COLORS.divider } }}>
        {!user ? (
          <AuthNavigator />
        ) : isAdmin ? (
          <AdminNavigator />
        ) : (
          <CustomerNavigator />
        )}
      </NavigationContainer>
    </NavigationIndependentTree>
  );
};

export default AppNavigator;
