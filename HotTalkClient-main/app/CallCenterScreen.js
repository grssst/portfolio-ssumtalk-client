import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Keyboard, TouchableWithoutFeedback  } from 'react-native';
import Constants from 'expo-constants';
import DropDownPicker from 'react-native-dropdown-picker'; // 추가
import EncryptedStorage from 'react-native-encrypted-storage';
import colors from './styles/colors';

export default function CallCenterScreen({ navigation }) {
  const API_URL = Constants.expoConfig.extra.API_URL;

  // 문의 내용
  const [message, setMessage] = useState(`로그인 이메일: \n답변 받을 이메일: \n문의 내용: `);
  const [loading, setLoading] = useState(false);

  // DropDownPicker 상태
  const [open, setOpen] = useState(false);  // 드롭다운 열림/닫힘
  const [value, setValue] = useState(null); // 선택된 value
  const [items, setItems] = useState([
    { label: '이용 장애 문의', value: '이용 장애 문의' },
    { label: '매칭 및 채팅 문의', value: '매칭 및 채팅 문의' },
    { label: '결제 문의', value: '결제 문의' },
    { label: '신고 및 차단 문의', value: '신고 및 차단 문의' },
    { label: '개선 제안', value: '개선 제안' },
    { label: '기타 문의', value: '기타 문의' },
  ]);

  const handleSubmit = async () => {
    // value: 드롭다운에서 선택된 문의 종류
    if (!value || !message.trim()) {
      Alert.alert('오류', '문의 종류와 내용을 모두 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert('다시 로그인 해주세요.');
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }

      const callData = {
        callCenterContent: message,   // 문의 내용
        category: value,             // 드롭다운에서 선택된 카테고리
      };

      const response = await fetch(`${API_URL}/api/call-center/fetch-call-center`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(callData),
      });

      if (response.ok) {
        Alert.alert('문의 접수 완료', '문의가 성공적으로 접수되었습니다.');
        setValue(null);
        setMessage('');
      } else {
        Alert.alert('오류', '문의 접수에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('문의 전송 중 오류:', error);
      Alert.alert('오류', '문의 전송 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <View style={styles.container}>
      <Text style={styles.label}>문의 종류를 선택해주세요:</Text>
      {/* DropDownPicker 적용 */}
      <DropDownPicker
        open={open}
        value={value}
        items={items}
        setOpen={setOpen}
        setValue={setValue}
        setItems={setItems}
        placeholder="문의 종류를 선택하세요"
        containerStyle={{ marginBottom: 20 }}
        style={{
          borderColor: '#ccc',
          borderRadius: 8,
        }}
        dropDownContainerStyle={{
          borderColor: '#ccc',
        }}
      />

      <Text style={styles.label}>문의 내용을 작성해주세요:</Text>
      <TextInput
        style={styles.textInput}
        placeholder="문의 내용을 입력하세요"
        placeholderTextColor="#999"
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={5}
      />

      <Text style={styles.infoText}>
        문의 시 정확한 처리를 위해 회원님의 이메일 주소를 함께 기재해주세요.
      </Text>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>{loading ? '전송 중...' : '문의 전송'}</Text>
      </TouchableOpacity>
    </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  textInput: {
    height: 180,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: colors.main,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#FFC0CB',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
