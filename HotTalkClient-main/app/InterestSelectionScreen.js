import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useNavigation, CommonActions, useRoute } from '@react-navigation/native';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';

const interests = [
    { id: 1, label: '💕진지한 연애' },
    { id: 2, label: '🚶‍♂️산책' },
    { id: 3, label: '👫동네 친구' },
    { id: 4, label: '🍺맥주' },
    { id: 5, label: '🍿영화' },
    { id: 6, label: '🥰캐주얼한 연애' },
    { id: 7, label: '📺넷플릭스' },
    { id: 8, label: '🏋️‍♀️운동' },
    { id: 9, label: '🎶음악 감상' },
    { id: 10, label: '✈️여행' },
    { id: 11, label: '🎮게임' },
    { id: 12, label: '📖독서' },
    { id: 13, label: '👩‍🍳요리' },
    { id: 14, label: '🚗드라이브' },
    { id: 15, label: '🎲보드게임' },
    { id: 16, label: '🍷술' },
    { id: 17, label: '😋맛집' },
    { id: 18, label: '🎤노래' },
    { id: 19, label: '☕카페' },
];

const { width, height } = Dimensions.get('window');
export default function InterestSelectionScreen() {
  const [selectedInterestsKey, setSelectedInterestsKey] = useState([]);


    const navigation = useNavigation();
    const route = useRoute();
    const API_URL = Constants.expoConfig.extra.API_URL;
    const selectedInterestsKeyNew = route.params?.selectedInterestsKeyNew;
    const externalUserId = route.params?.externalUserId;


    // 선택된 관심사 여부를 확인할 때 undefined 방지
    const handleToggleInterest = (id) => {
        setSelectedInterestsKey((prev) => {
          if (prev.includes(id)) {
            // 이미 선택된 id가 있다면 제거
            return prev.filter((item) => item !== id);
          } else {
            //console.log(selectedInterestsKey.length);
            if (selectedInterestsKey.length >= 7) {
                // Toast로 경고 메시지 표시
                Toast.show({
                    type: 'custom',
                    text1: '7개까지만 선택 가능합니다.',
                    position: 'top',
                });
                return [...prev];
            }
            // 새로운 id 추가 후 정렬
            return [...prev, id].sort((a, b) => a - b);
          }
        });
      };
      
    
    const handleSaveInterests = () => {
        navigation.navigate('ProfileScreen', {
        ...route.params,
        selectedInterestsKeyNew: selectedInterestsKey,
        });
    };



  useEffect(() => {
    if (Array.isArray(selectedInterestsKeyNew)) {
      setSelectedInterestsKey(selectedInterestsKeyNew); // 배열인 경우에만 상태 업데이트
    } else {
      setSelectedInterestsKey([]); // 유효하지 않은 값인 경우 빈 배열로 초기화
    }
  }, [selectedInterestsKeyNew]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>관심사 선택</Text>
      <View style={styles.interestsContainer}>
        {interests.map((interest) => (
          <TouchableOpacity
            key={interest.id}
            style={[
              styles.interestItem,
              selectedInterestsKey.includes(interest.id) && styles.selectedInterest,
            ]}
            onPress={() => handleToggleInterest(interest.id)}
          >
            <Text
              style={[
                styles.interestText,
                selectedInterestsKey.includes(interest.id) && styles.selectedInterestText,
              ]}
            >
              {interest.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.saveButton} onPress={handleSaveInterests}>
        <Text style={styles.saveButtonText}>선택 완료</Text>
      </TouchableOpacity>
      <Toast config={toastConfig} />
    </ScrollView>
  );
}


const toastConfig = {
    custom: ({ text1, props }) => (
      <View style={styles.customToastContainer}>
        <Text style={styles.customToastTitle}>{text1}</Text>
      </View>
    ),
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: height * 0.1,
    textAlign: 'center',
    marginTop: height * 0.2,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  interestItem: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    margin: 5,
  },
  selectedInterest: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  interestText: {
    fontSize: 16,
    color: '#333',
  },
  selectedInterestText: {
    color: '#fff',
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: '#FF6B6B',
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  customToastContainer: {
    width: '90%',
    padding: 15,
    backgroundColor: '#8F8FA3',
    borderRadius: 8,
    alignItems: 'center',
  },
  customToastTitle: {
    fontSize: 16,
    color: 'white',
  },
  customToastMessage: {
    fontSize: 14,
    color: 'white',
    marginTop: 5,
  },
});
