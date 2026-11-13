import React, { useContext } from 'react';
import { DefaultTheme, DarkTheme, NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AuthNavigator from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import AdminNavigator from './AdminNavigator';
import SplashScreen from '../components/SplashScreen';

const AppNavigator = () => {
  const { user, loading, isAdmin } = useContext(AuthContext);
  const { colors, isDark } = useTheme();

  if (loading) {
    return <SplashScreen />;
  }

  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.divider,
    },
  };

  return (
    <NavigationIndependentTree>
      <NavigationContainer theme={navigationTheme}>
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
