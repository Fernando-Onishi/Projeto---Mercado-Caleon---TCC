import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFonts } from 'expo-font';
import { StackActions } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Octicons from '@expo/vector-icons/Octicons';
import useSacolaCount from './useSacolaCount';

const tabs = [
  { label: 'Início', icon: 'home', route: 'TelaHome' },
  { label: 'Favoritos', icon: 'heart', route: 'TelaFavorito' },
  { label: 'Sacola', icon: 'shopping-outline', route: 'TelaSacola' },
  { label: 'Catálogo', icon: 'clipboard-list-outline', route: 'TelaProdutos' },
  { label: 'Perfil', icon: 'account-outline', activeIcon: 'account', route: 'TelaPerfil' },
];

export default function NavegacaoInferior({ activeTab, navigation, onUnavailable }) {
  const bagCount = useSacolaCount();

  useFonts({
    LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
  });

  function handlePress(tab) {
    if (tab.route) {
      if (tab.label !== activeTab) {
        if (tab.label === 'Perfil') {
          navigation.dispatch(StackActions.popTo(tab.route));
        } else {
          navigation.navigate(tab.route);
        }
      }
      return;
    }

    if (onUnavailable) {
      onUnavailable(tab.label);
      return;
    }

    Alert.alert(tab.label, 'Esta tela ainda não está disponível no aplicativo.');
  }

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const active = tab.label === activeTab;

        return (
          <TouchableOpacity
            key={tab.label}
            style={styles.tab}
            onPress={() => handlePress(tab)}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
          >
            <View style={[styles.tabIcon, active && styles.activeTabIcon]}>
              {tab.label === 'Início' ? (
                <Octicons
                  name={active ? 'home-fill' : 'home'}
                  size={23}
                  color={active ? '#ffffff' : '#757575'}
                />
              ) : tab.label === 'Favoritos' ? (
                <Ionicons
                  name={active ? 'heart' : 'heart-outline'}
                  size={26}
                  color={active ? '#ffffff' : '#757575'}
                />
              ) : (
                <MaterialCommunityIcons
                  name={active && tab.activeIcon ? tab.activeIcon : tab.icon}
                  size={26}
                  color={active ? '#ffffff' : '#757575'}
                />
              )}

              {tab.label === 'Sacola' && bagCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.badgeText}>{bagCount > 99 ? '99+' : bagCount}</Text>
                </View>
              )}
            </View>

            <Text style={[styles.tabLabel, active && styles.activeTabLabel]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 88,
    borderTopWidth: 1,
    borderTopColor: '#dfe3e6',
    backgroundColor: '#f2f3f4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  tabIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderRadius: 12,
  },
  activeTabIcon: {
    backgroundColor: '#0a7d67',
  },
  tabBadge: {
    position: 'absolute',
    right: -4,
    top: -2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: '#ff2c2c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontFamily: 'LilitaOne_400Regular',
    fontSize: 9,
  },
  tabLabel: {
    color: '#747474',
    fontFamily: 'LilitaOne_400Regular',
    fontSize: 10,
    marginTop: 4,
  },
  activeTabLabel: {
    color: '#0a7d67',
  },
});