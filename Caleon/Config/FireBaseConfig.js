import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
	getAuth,
	getReactNativePersistence,
	initializeAuth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyC1t5FDO_O0Oxj2lemKUbJKnYWOfswHxOs',
  authDomain: 'projetocaleon.firebaseapp.com',
  projectId: 'projetocaleon',
  storageBucket: 'projetocaleon.firebasestorage.app',
  messagingSenderId: '749541631286',
  appId: '1:749541631286:web:0b109220d1d69a2b35ff97',
  measurementId: 'G-2Y9LGLJ7MR',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

function createAuth() {
	try {
		return initializeAuth(app, {
			persistence: getReactNativePersistence(AsyncStorage),
		});
	} catch (error) {
		if (error.code !== 'auth/already-initialized') {
			throw error;
		}
		return getAuth(app);
	}
}

export const auth = createAuth();