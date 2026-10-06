import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import EncryptedStorage from 'react-native-encrypted-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import Constants from 'expo-constants';
import colors from './styles/colors';



export default function WriteScreen() {
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const MAX_LINES = 7; // 최대 줄 수
  const navigation = useNavigation();
  const API_URL = Constants.expoConfig.extra.API_URL;
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const selectedUri = result.assets && result.assets.length > 0 ? result.assets[0].uri : result.uri;
      setImage({ uri: selectedUri });
    }
  };
  
  /*useEffect(()=> {
    for(let i=0; i<200; i++){
      console.log(i);
      setContent(i);
      handleSubmit();
    }
    
  }, [content]);*/

  const handleContentChange = (text) => {
    const lines = text.split('\n');
    if (lines.length <= MAX_LINES) {
      setContent(text);
    } else {
      Alert.alert('줄 제한', `최대 ${MAX_LINES}줄까지만 입력 가능합니다.`);
    }
  };

  const handleSubmit = async () => {
    if (!content) {
      setErrorMessage('내용을 입력하세요.');
      return;
    }

    const token = await EncryptedStorage.getItem('userToken');

    if (!token) {
      Alert.alert("다시 로그인 해주세요.");
      navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
      return;
    }

    const formData = new FormData();
    formData.append('content', content);

    if (image) {
      const uriParts = image.uri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      formData.append('image', {
        uri: image.uri,
        name: `photo.${fileType}`,
        type: `image/${fileType}`,
      });
    }

    try {
      const response = await fetch(`${API_URL}/api/posts/create-post`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (response.status === 401) {
        Alert.alert('세션 만료', '로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
        navigation.navigate('LoginScreen');
        return;
      }

      if (response.ok) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: '(tabs)' }],
          })
        );
      } else if(response.status === 401){
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }  else {
        Alert.alert('등록 실패', '글 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('등록 실패', '글 등록 중 오류가 발생했습니다.');
    }
  };
  
  
  
  
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="내용을 입력하세요"
          value={content}
          onChangeText={handleContentChange}
          multiline
        />
        <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
          {image ? (
            <Image source={image} style={styles.image} />
          ) : (
            <Text style={styles.imagePickerText}>사진 등록</Text>
          )}
        </TouchableOpacity>
        {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
        
        <TouchableOpacity onPress={handleSubmit} style={styles.button}>
          <Text style={styles.buttonText}>등록하기</Text>
        </TouchableOpacity>
        <Text style={styles.warningMessage}>
          욕설, 비속어, 또는 부적절한 사진이나 글을 올리지 마세요.
        </Text>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  input: {
    height: 200,
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  imagePicker: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    width: 200,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    backgroundColor: '#fff',
    alignSelf: 'center'
  },
  imagePickerText: {
    color: '#999',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
  errorMessage: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
  button: {
    marginTop: 20,
    backgroundColor: colors.main,
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningMessage: {
    marginTop: 20,
    color: 'gray',
    fontSize: 14,
    textAlign: 'center',
  },
});
