import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import colors from './styles/colors';

export default function AgreementScreen() {
  const [agreements, setAgreements] = useState({
    all: false,
    termsOfService: false,
    locationService: false,
    privacyPolicy: false,
    privacyUse: false,
  });
  const navigation = useNavigation();

  const toggleAgreement = (key) => {
    setAgreements((prev) => {
      const updatedAgreements = { ...prev, [key]: !prev[key] };

      if (key === 'all') {
        Object.keys(updatedAgreements).forEach((k) => {
          updatedAgreements[k] = !prev.all;
        });
      } else {
        updatedAgreements.all = Object.values(updatedAgreements).every((v) => v);
      }

      return updatedAgreements;
    });
  };

  const viewDetails = (screen) => {
    navigation.navigate(screen);
  };

  const handleContinue = () => {
    if (agreements.termsOfService && agreements.locationService && agreements.privacyPolicy && agreements.privacyUse) {
      navigation.navigate('LoginScreen');
    } else {
      Alert.alert('알림', '모든 항목에 동의해야 합니다.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>서비스 이용 동의</Text>

      <View style={styles.agreementSection}>
        <TouchableOpacity style={styles.checkboxContainer} onPress={() => toggleAgreement('all')}>
          <View style={styles.checkbox}>
            {agreements.all && <Ionicons name="checkmark" size={24} color="#007BFF" />}
          </View>
          <Text style={styles.checkboxLabel}>모두 동의합니다</Text>
        </TouchableOpacity>

        <View style={styles.separator} />

        <View style={styles.checkboxContainer}>
          <TouchableOpacity onPress={() => toggleAgreement('termsOfService')}>
            <View style={styles.checkbox}>
              {agreements.termsOfService && <Ionicons name="checkmark" size={24} color="#007BFF" />}
            </View>
          </TouchableOpacity>
          <Text style={styles.checkboxLabel}>서비스 이용약관</Text>
          <TouchableOpacity onPress={() => viewDetails('TermsOfServiceScreen')}>
            <Text style={styles.viewText}>보기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity onPress={() => toggleAgreement('locationService')}>
            <View style={styles.checkbox}>
              {agreements.locationService && <Ionicons name="checkmark" size={24} color="#007BFF" />}
            </View>
          </TouchableOpacity>
          <Text style={styles.checkboxLabel}>위치기반서비스 이용약관</Text>
          <TouchableOpacity onPress={() => viewDetails('LocationServiceScreen')}>
            <Text style={styles.viewText}>보기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity onPress={() => toggleAgreement('privacyPolicy')}>
            <View style={styles.checkbox}>
              {agreements.privacyPolicy && <Ionicons name="checkmark" size={24} color="#007BFF" />}
            </View>
          </TouchableOpacity>
          <Text style={styles.checkboxLabel}>개인정보 처리방침</Text>
          <TouchableOpacity onPress={() => viewDetails('PrivacyPolicyScreen')}>
            <Text style={styles.viewText}>보기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity onPress={() => toggleAgreement('privacyUse')}>
            <View style={styles.checkbox}>
              {agreements.privacyUse && <Ionicons name="checkmark" size={24} color="#007BFF" />}
            </View>
          </TouchableOpacity>
          <Text style={styles.checkboxLabel}>개인정보 수집이용</Text>
          <TouchableOpacity onPress={() => viewDetails('PrivacyUseScreen')}>
            <Text style={styles.viewText}>보기</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>동의하고 계속하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    paddingTop: 100,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 60,
    color: '#333',
  },
  agreementSection: {
    width: '100%',
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#666',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  viewText: {
    color: '#007BFF',
    textDecorationLine: 'underline',
  },
  separator: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 5,
    marginBottom: 20,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 0,
    paddingBottom: 20,
  },
  button: {
    backgroundColor: colors.main,
    paddingVertical: 15,
    borderRadius: 5,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
