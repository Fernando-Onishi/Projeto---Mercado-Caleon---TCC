import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFonts } from 'expo-font';
import { CLIENT_TAB_ROUTES, openTab, useTabPager, useTabPagerPage } from './TabPagerContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Octicons from '@expo/vector-icons/Octicons';
import useSacolaCount from './useSacolaCount';
import useFavoritosCount from './useFavoritosCount';
import { themedStyles, tc } from '../Config/Tema';

const tabs = [
  { label: 'Início', icon: 'home', route: 'TelaHome' },
  { label: 'Favoritos', icon: 'heart', route: 'TelaFavorito' },
  { label: 'Sacola', icon: 'shopping-outline', activeIcon: 'shopping', route: 'TelaSacola' },
  { label: 'Catálogo', icon: 'clipboard-list-outline', activeIcon: 'clipboard-list', route: 'TelaProdutos' },
  { label: 'Perfil', icon: 'account-outline', activeIcon: 'account', route: 'TelaPerfil' },
];

export default function NavegacaoInferior({ activeTab, navigation, onUnavailable }) {
  const bagCount = useSacolaCount();
  const favoriteCount = useFavoritosCount();

  const pager = useTabPager();
  const pagerPage = useTabPagerPage();

  useFonts({
    LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
  });

  // Dentro do carrossel a barra é única e fica fixa por cima das páginas;
  // cada página só reserva o espaço dela.
  if (pagerPage) return <View style={styles.pagerSpacer} />;

  function handlePress(tab) {
    if (tab.route) {
      if (tab.label !== activeTab) {
        if (CLIENT_TAB_ROUTES.includes(tab.route)) {
          openTab(navigation, pager, 'TelaHome', tab.route);
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
            <View style={styles.tabIcon}>
              {/* Fundo verde como peça própria: no Android o arredondamento some quando a cor muda depois. */}
              {active ? <View style={styles.activeBg} pointerEvents="none" /> : null}
              {tab.label === 'Início' ? (
                <Octicons
                  name={active ? 'home-fill' : 'home'}
                  size={23}
                  color={tc(active ? '#ffffff' : '#757575')}
                />
              ) : tab.label === 'Favoritos' ? (
                <Ionicons
                  name={active ? 'heart' : 'heart-outline'}
                  size={26}
                  color={tc(active ? '#ffffff' : '#757575')}
                />
              ) : (
                <MaterialCommunityIcons
                  name={active && tab.activeIcon ? tab.activeIcon : tab.icon}
                  size={26}
                  color={tc(active ? '#ffffff' : '#757575')}
                />
              )}

              {tab.label === 'Sacola' && bagCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.badgeText}>{bagCount > 99 ? '99+' : bagCount}</Text>
                </View>
              )}

              {tab.label === 'Favoritos' && favoriteCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.badgeText}>{favoriteCount > 99 ? '99+' : favoriteCount}</Text>
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

const styles = themedStyles(StyleSheet.create({
  pagerSpacer: {
    height: 92,
  },
  tabBar: {
    height: 92,
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
    paddingTop: 4,
  },
  tabIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderRadius: 12,
  },
  activeBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: '#076653',
  },
  activeTabIcon: {
    backgroundColor: '#076653',
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
    color: '#076653',
  },
}));