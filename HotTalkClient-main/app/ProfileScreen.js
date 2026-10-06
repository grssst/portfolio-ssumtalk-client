import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TextInput, TouchableOpacity, Platform, StyleSheet, Image, Modal, Dimensions, ScrollView, Alert, TouchableWithoutFeedback } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, CommonActions, useRoute } from '@react-navigation/native';
import Constants from 'expo-constants';
import EncryptedStorage from 'react-native-encrypted-storage';
import colors from './styles/colors';



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
export default function ProfileScreen() {
  const [image, setImage] = useState(null);
  const [image2, setImage2] = useState(null);
  const [image3, setImage3] = useState(null);
  const [nickname, setNickname] = useState('');
  const [beforeNickname, setBeforeNickname] = useState('');
  const [gender, setGender] = useState('male');
  const [age, setAge] = useState('20');
  const [status, setStatus] = useState('');
  const [myLocation, setMyLocation] = useState('');
  const [showMyLocationModal, setShowMyLocationModal] = useState(false);
  const [showAgePicker, setShowAgePicker] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  const [isCustomInput, setIsCustomInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showImageOptionsModal, setShowImageOptionsModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [selectedInterestsKey, setSelectedInterestsKey] = useState([]); // 초기 상태를 빈 배열로 설정
  const [tryCount, setTryCount] = useState(0);
  const [isProfileChanged1, setProfileChanged1] = useState(false);
  const [isProfileChanged2, setProfileChanged2] = useState(false);
  const [isProfileChanged3, setProfileChanged3] = useState(false);

  const navigation = useNavigation();
  const route = useRoute();
  const API_URL = Constants.expoConfig.extra.API_URL;
  
  // route.params에서 externalUserId 가져오기
  const externalUserId = route.params?.externalUserId;
  const isChangeProfile = route.params?.isChangeProfile;
  const selectedInterestsKeyNew = route.params?.selectedInterestsKeyNew;


  useEffect(()=>{
    console.log(setSelectedInterestsKey);
    setSelectedInterestsKey(selectedInterestsKeyNew);
  }, [selectedInterestsKeyNew]);

  useEffect(()=>{
    console.log(selectedInterestsKey);
  }, [selectedInterestsKey]);

  const locations = [
    '서울',
    '부산',
    '대구',
    '인천',
    '경기',
    '광주',
    '대전',
    '울산',
    '세종',
    '경북',
    '경남',
    '강원',
    '충북',
    '충남',
    '전북',
    '전남',
    '제주',
    '해외',
  ];

  useEffect(()=>{
    console.log('image1:', image);
    console.log('image2:', image2);
    console.log('image3:', image3);
    console.log('-------------------------------------------------');
  }, [image, image2, image3]);


  const handleImagePress = (index) => {
    if (index === 1 && !image) {
      pickImage(index, setImage);
    } else if (index === 2 && !image2) {
      pickImage(index, setImage2);
    } else if (index === 3 && !image3) {
      pickImage(index, setImage3);
    } else {
      setSelectedImageIndex(index); // 눌린 이미지의 인덱스를 설정
      setShowImageOptionsModal(true);
    }
  };
  

  const handleNavigateToInterests = () => {
    navigation.navigate('InterestSelectionScreen', {...route.params, selectedInterestsKeyNew: selectedInterestsKey});
  };



  const pickImage = async (imageNumber, setImageCallback) => {
    setTimeout(async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
  
    console.log("이거!!", imageNumber);
  
    if (!result.canceled) {
      const selectedUri = result.assets && result.assets.length > 0 ? result.assets[0].uri : result.uri;
  
      if (selectedUri) {
        try {
          // 이미지 파일 크기 확인
          const response = await fetch(selectedUri);
          const blob = await response.blob();
          const sizeInMB = blob.size / (1024 * 1024); // 바이트를 MB로 변환
  
          console.log(`Selected image size: ${sizeInMB.toFixed(2)} MB`);
  
          if (sizeInMB > 20) {
            Alert.alert('이미지 선택 오류', '이미지 크기가 20MB를 초과합니다. 다른 이미지를 선택해주세요.');
            return;
          }
  
          //setImage({ uri: selectedUri });
          setImageCallback({ uri: selectedUri });

          if(imageNumber === 1) {
            setProfileChanged1(true);
          } else if (imageNumber === 2) {
            setProfileChanged2(true);
          } else if (imageNumber === 3) {
            setProfileChanged3(true);
          }



        } catch (error) {
          console.error('Error fetching image size:', error);
          Alert.alert('이미지 선택 오류', '이미지 크기를 확인하지 못했습니다. 다시 시도해 주세요.');
        }
      } else {
        Alert.alert('이미지 선택 오류', '이미지를 선택하지 못했습니다. 다시 시도해 주세요.');
      }
    }
  }, 200); // 300ms 지연 적용
  };
  

  const handleTopicSelection = (selectedTopic) => {
    if (selectedTopic === '직접 입력') {
      setIsCustomInput(true);
      setShowTopicModal(true);
    } else {
      setStatus(selectedTopic);
      setIsCustomInput(false);
      setShowTopicModal(false);
      setCustomTopic('');
    }
  };

  const handleLocationSelection = (selectedLocation) => {
      setMyLocation(selectedLocation);
      setShowMyLocationModal(false);
  };


  const handleCustomTopicSubmit = () => {
    setStatus(customTopic);
    setShowTopicModal(false);
  };

  const handleMyLocationSubmit = () => {
    setMyLocation(myLocation);
    setShowMyLocationModal(false);
  };

  const getUser = async () => {
    setLoading(true);
    const token = await EncryptedStorage.getItem('userToken');
    if (!token) {
      Alert.alert("다시 로그인 해주세요.");
      navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
      return;
    }
    const menImage = require('../assets/images/men.png');
    const womenImage = require('../assets/images/women.png');
    try {
      const response = await fetch(`${API_URL}/api/users/get-user-profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if(response.ok){
        const data = await response.json();
        setNickname(data.nickname);
        setBeforeNickname(data.nickname);
        setAge(data.age);
        setGender(data.gender);
        //console.log(data);
        setStatus(data.status);
        setMyLocation(data.myLocation);
        setCustomTopic(data.status);
        setSelectedInterestsKey(data.interestsKey?.split(',').map(Number));
        // 이미지 URL을 Image 컴포넌트에서 사용할 수 있도록 변환
        if (data.profileImageUrl && data.profileImageUrl != '../assets/images/men.png' && data.profileImageUrl != '../assets/images/women.png') {
          setImage({ uri: data.profileImageUrl });
        }
        else if(data.profileImageUrl === '../assets/images/men.png'){
          setImage(null);

        }
        else if(data.profileImageUrl === '../assets/images/women.png'){
          setImage(null);
        }

        // 이미지 URL을 Image 컴포넌트에서 사용할 수 있도록 변환
        if (data.profileImageUrl2 && data.profileImageUrl2 != '../assets/images/men.png' && data.profileImageUrl2 != '../assets/images/women.png') {
          setImage2({ uri: data.profileImageUrl2 });
        }
        else if(data.profileImageUrl2 === '../assets/images/men.png'){
          setImage2(null);

        }
        else if(data.profileImageUrl2 === '../assets/images/women.png'){
          setImage2(null);
        }

        // 이미지 URL을 Image 컴포넌트에서 사용할 수 있도록 변환
        if (data.profileImageUrl3 && data.profileImageUrl3 != '../assets/images/men.png' && data.profileImageUrl3 != '../assets/images/women.png') {
          setImage3({ uri: data.profileImageUrl3 });
        }
        else if(data.profileImageUrl3 === '../assets/images/men.png'){
          setImage3(null);

        }
        else if(data.profileImageUrl3 === '../assets/images/women.png'){
          setImage3(null);
        }

        //console.log(data.profileImageUrl);
      } else {
        console.log(response.json);
      }



    } catch (error) {
      console.error('프로필 불러오기 오류:', error);
      Alert.alert('오류', '프로필을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }

  
  }


  useEffect( ()=> {
    if(isChangeProfile){
      getUser();
    }
  }, [isChangeProfile]);

  const handleGoBack = () => {
    navigation.goBack();
  }

  const handleDefaultProfile = () => {
    if (selectedImageIndex === 1) {
      setImage(image2 || image3 || null);
      setImage2(image3 || null);
      setImage3(null);
      setProfileChanged1(true);
      setProfileChanged2(true);
      setProfileChanged3(true);
    } else if (selectedImageIndex === 2) {
      setImage2(image3 || null);
      setImage3(null);
      setProfileChanged2(true);
      setProfileChanged3(true);
    } else if (selectedImageIndex === 3) {
      setImage3(null);
      setProfileChanged3(true);
    }
    setShowImageOptionsModal(false); // 모달 닫기
  };
  
  


    
  const handleSaveProfile = async (currentTryCount = 0) => { 
    if(loading){
      return;
    }
    setLoading(true);
    console.log("프로필 변경시도");
    
    console.log(selectedInterestsKey);
    if (!nickname || !age || !status || !myLocation || !selectedInterestsKey || selectedInterestsKey.length === 0) {
      setLoading(false);
      Alert.alert('필드 오류', '모든 필드를 채워주세요.');
      return;
    }

    // 🚨 닉네임 금지어 검사 🚨
    if (nickname.includes('운영자')) {
      setLoading(false);
      Alert.alert('닉네임 제한', '운영자는 닉네임으로 사용할 수 없습니다.');
      return;
    }

    const interestsKey = selectedInterestsKey.join(','); // "1,3,6,10"

    const profileData = {
      nickname,
      gender,
      age,
      status,
      externalUserId, // externalUserId 추가
      myLocation,
      interestsKey:interestsKey,
    };


    const formData = new FormData();
    formData.append('profileData', JSON.stringify(profileData));
    const menImage = require('../assets/images/men.png');
    const womenImage = require('../assets/images/women.png');

    if (image) 
     {
      const uriParts = image.uri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      formData.append('image', {
        uri: image.uri,
        name: `photo.${fileType}`,
        type: `image/${fileType}`,
      });
    } else {
      // 기본 이미지를 전송합니다.
      const defaultImage = gender === 'male'
        ? '../assets/images/men.png'
        : '../assets/images/women.png';

      //const defaultImageUri = Image.resolveAssetSource(defaultImage).uri;
      formData.append('profileImageUrl', defaultImage);
    }

    if(image2){
      const uriParts = image2.uri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      formData.append('image2', {
        uri: image2.uri,
        name: `photo.${fileType}`,
        type: `image/${fileType}`,
      });
    }
    else {
      // 기본 이미지를 전송합니다.
      const defaultImage = gender === 'male'
        ? '../assets/images/men.png'
        : '../assets/images/women.png';

      //const defaultImageUri = Image.resolveAssetSource(defaultImage).uri;
      formData.append('profileImageUrl2', defaultImage);
    }
    if(image3){
      const uriParts = image3.uri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      formData.append('image3', {
        uri: image3.uri,
        name: `photo.${fileType}`,
        type: `image/${fileType}`,
      });
    }
    else {
      // 기본 이미지를 전송합니다.
      const defaultImage = gender === 'male'
        ? '../assets/images/men.png'
        : '../assets/images/women.png';

      //const defaultImageUri = Image.resolveAssetSource(defaultImage).uri;
      formData.append('profileImageUrl3', defaultImage);
    }

    formData.append('isProfileChanged1', isProfileChanged1);
    formData.append('isProfileChanged2', isProfileChanged2);
    formData.append('isProfileChanged3', isProfileChanged3);

    console.log('Saving profile data:', profileData);  // 디버깅 메시지 추가

    if (formData._parts) {
      console.log('FormData entries:', formData._parts);
    } else {
      console.error('FormData is not properly initialized.');
    }
    
    try {
      const response = await fetch(`${API_URL}/api/users/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      const responseText = await response.text();
      
      if (response.ok) {
        console.log('Server response:', responseText); // 서버 응답 출력
        // 서버 응답이 성공적일 때의 처리
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: '(tabs)' }],
          })
        );
        setLoading(false);
      } else if(response.status === 401){
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        setLoading(false);
        return;
      }  else {
        Alert.alert('프로필 저장 오류', '프로필 저장에 실패했습니다. 다시 시도해주세요');
        setLoading(false);
      }
    } catch (error) {
      if (currentTryCount < 15) {
        console.log(`재시도 ${currentTryCount + 1}회`);
        setTimeout(() => handleSaveProfile(currentTryCount + 1), 100); // 재귀 호출로 재시도
      } else {
        Alert.alert('프로필 저장 오류', '프로필 저장에 실패했습니다. 다시 시도해주세요');
        console.error(error);
        setLoading(false);
      }
      
      
    }finally {
      //setLoading(false);
    }
  };

  useEffect(()=> {
    console.log('try count:', tryCount);
  }, [tryCount]);
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text>적용 중...</Text>
      </View>
    );
  }
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>프로필</Text>
      <View style={styles.imageRow}>
        {/* 왼쪽 이미지 */}
        {image ? (
          <TouchableOpacity
            style={styles.sideImagePicker}
            onPress={() => handleImagePress(2)} // 2번 이미지
          >
            {image2 ? (
              <Image source={image2} style={styles.sideImage} />
            ) : (
              <Image
                source={require('../assets/images/profilePlus.png')}
                style={styles.sideImage}
              />
            )}
          </TouchableOpacity>
        ) : (
          // 투명한 View로 공간 차지
          <View style={[styles.sideImagePicker, styles.transparentPlaceholder]} />
        )}

        {/* 메인 이미지 칸 */}
        <TouchableOpacity
          style={styles.imagePicker}
          onPress={() => handleImagePress(1)} // 1번 이미지
        >
          {image ? (
            <Image source={image} style={styles.image} />
          ) : (
            <Image
              source={require('../assets/images/profilePlus.png')}
              style={styles.image}
            />
          )}
        </TouchableOpacity>

        {/* 오른쪽 이미지 */}
        {image2 ? (
          <TouchableOpacity
            style={styles.sideImagePicker}
            onPress={() => handleImagePress(3)} // 3번 이미지
          >
            {image3 ? (
              <Image source={image3} style={styles.sideImage} />
            ) : (
              <Image
                source={require('../assets/images/profilePlus.png')}
                style={styles.sideImage}
              />
            )}
          </TouchableOpacity>
        ) : (
          // 투명한 View로 공간 차지
          <View style={[styles.sideImagePicker, styles.transparentPlaceholder]} />
        )}
      </View>


      <View style={styles.genderContainer}>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'male' && styles.selectedGenderButton]}
          onPress={() => setGender('male')}
        >
          <Text style={[styles.genderText, gender === 'male' && styles.selectedGenderText]}>남자</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'female' && styles.selectedGenderButton2]}
          onPress={() => setGender('female')}
        >
          <Text style={[styles.genderText, gender === 'female' && styles.selectedGenderText]}>여자</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>나이</Text>
        <TouchableOpacity style={styles.pickerField} onPress={() => setShowAgePicker(true)}>
          <Text style={styles.fieldText}>{age}살</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>닉네임</Text>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="닉네임을 입력하세요"
          placeholderTextColor="#999"
          maxLength={20} // 글자 수 제한
        />
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>활동 지역</Text>
        <TouchableOpacity style={styles.pickerField} onPress={() => setShowMyLocationModal(true)}>
          <Text
            style={[
              styles.fieldText,
              !myLocation && styles.placeholderText, // 기본값일 때 회색 스타일 적용
            ]}
          >
            {myLocation || '활동 지역을 선택하세요'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>나의 소개</Text>
        <TouchableOpacity style={styles.pickerField} onPress={() => setShowTopicModal(true)}>
          <Text
            style={[
              styles.fieldText,
              !status && styles.placeholderText, // 기본값일 때 회색 스타일 적용
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {status || '간단히 소개해주세요'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>관심사</Text>
        <TouchableOpacity style={styles.pickerField} onPress={handleNavigateToInterests}>
          <Text
            style={[
              styles.fieldText,
              !selectedInterestsKey?.length && styles.placeholderText, // 선택된 값이 없을 때 회색 스타일
            ]}
            numberOfLines={1} // 한 줄만 표시
            ellipsizeMode="tail" // 넘칠 경우 ...으로 표시
          >
            {selectedInterestsKey?.length > 0
              ? selectedInterestsKey
                  .map((key) => interests.find((interest) => interest.id === key)?.label) // id로 레이블 값 찾기
                  .filter(Boolean) // undefined 제거
                  .join(', ') // 레이블 값을 콤마로 구분
              : '관심사를 선택하세요'}
        </Text>
        </TouchableOpacity>
      </View>


      <TouchableOpacity style={styles.button} onPress={() => {
        setLoading(true);
        setTimeout(() => {
                handleSaveProfile();
              }, 0); // 약간의 지연 추가
        }}>
        <Text style={styles.buttonText}>
          {isChangeProfile ? '프로필 변경' : '프로필 저장'}
        </Text>
      </TouchableOpacity>

    {isChangeProfile && (
      <TouchableOpacity style={styles.cancelButton} onPress={handleGoBack}>
        <Text style={styles.buttonText}>취소</Text>
      </TouchableOpacity>
    )}




      {/* Age Picker Modal */}
      <Modal
        visible={showAgePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAgePicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAgePicker(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.pickerWrapper}>
              <ScrollView style={styles.scrollView}>
                {Array.from({ length: 81 }, (_, i) => i + 20).map((ageValue) => (
                  <TouchableOpacity key={ageValue} onPress={() => { setAge(ageValue); setShowAgePicker(false); }}
                  style={styles.pickerItem}>
                    <Text style={styles.pickerItem1}>{ageValue}살</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={() => setShowAgePicker(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>완료</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Topic Modal */}
      <Modal
        visible={showTopicModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTopicModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => {setShowTopicModal(false); setCustomTopic(status);}}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>나의 소개</Text>
                  <TextInput
                    style={styles.customTopicInput}
                    value={customTopic}
                    onChangeText={(text) => {
                      const lines = text.split('\n');
                      if (lines.length <= 5) {
                        setCustomTopic(text);
                      }
                    }}
                    placeholder="간단히 소개해주세요"
                    placeholderTextColor="#999"
                    multiline={true}
                    maxLength={150} // 글자 수 제한
                  />

                  <TouchableOpacity onPress={handleCustomTopicSubmit} style={styles.button2}>
                    <Text style={styles.buttonText}>확인</Text>
                  </TouchableOpacity>
                
             
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 이미지 옵션 모달 */}
      <Modal
        visible={showImageOptionsModal}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowImageOptionsModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowImageOptionsModal(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TouchableOpacity onPress={async () => {
                setShowImageOptionsModal(false);
                pickImage(selectedImageIndex, (selectedImageIndex === 1 ? setImage : selectedImageIndex === 2 ? setImage2 : setImage3));
              }}>
                <Text style={styles.modalOption}>사진 변경</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDefaultProfile}>
                <Text style={styles.modalOption}>사진 제거</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowImageOptionsModal(false)}>
                <Text style={styles.modalOptionCancel}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* myLocation Modal */}
      <Modal
        visible={showMyLocationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMyLocationModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowMyLocationModal(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.pickerWrapper}>
              <Text style={styles.modalTitle}>활동 지역</Text>
              <ScrollView style={styles.scrollView}>
              {locations.map((location) => (
                <TouchableOpacity key={location} onPress={() => handleLocationSelection(location)} style={styles.pickerItem}>
                  <Text style={styles.pickerItem1}>{location}</Text>
                </TouchableOpacity>
              ))}
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 0,
    color: '#333',
    textAlign: 'center',
    marginTop: 80,
  },
  imagePicker: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 50,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  imageRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  sideImagePicker: {
    alignItems: 'center',
    marginHorizontal: 13,
  },
  sideImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    marginTop: 50, // 위에서 아래로 이동
  },
  placeholderText: {
    color: '#999', // 회색 텍스트 색상
  },
  defaultImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  genderButton: {
    padding: 10,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  selectedGenderButton: {
    backgroundColor: '#7CAED6',
  },
  selectedGenderButton2: {
    backgroundColor: '#FFAEC9',
  },
  genderText: {
    color: '#333',
  },
  selectedGenderText: {
    color: '#fff',
  },
  fieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: Platform.OS === 'android' ? 15 : 15,
    width: 80,
  },
  pickerField: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    height: Platform.OS === 'android' ? 50 : 50, 
  },
  fieldText: {
    fontSize: Platform.OS === 'android' ? 15 : 15,
    color: '#333',
  },
  input: {
    height: Platform.OS === 'android' ? 50 : 50, 
    flex: 1,
    fontSize: Platform.OS === 'android' ? 15 : 15,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    color: '#333',
    backgroundColor: '#fff',
  },
  customTopicInput: {
    height: height * 0.15,
    width: '100%',
    textAlignVertical: 'top',
    padding: 10,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    color: '#333',
    backgroundColor: '#fff',

  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '80%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  locationModalContent: {
    backgroundColor: '#fff',
    width: '90%',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    height: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  transparentPlaceholder: {
    backgroundColor: 'transparent', // 투명 배경
    width: 80, // 사이드 이미지와 동일한 크기
    height: 80, // 사이드 이미지와 동일한 크기
  },  
  button: {
    marginTop: 20,
    backgroundColor: colors.main,
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: -10,
  },
  cancelButton: {
    marginTop: 20,
    backgroundColor: '#FFA6C9',
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  button2: {
    marginTop: 20,
    backgroundColor: colors.main,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    width: width * 0.25,
    
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 10,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007BFF',
  },
  scrollView: {
    maxHeight: height * 0.3,
    width: width * 0.5,
    backgroundColor: '#fff',


    marginBottom: 10,
  },
  pickerItem: {
    padding: 8,
    fontSize: 18,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickerItem1: {
    fontSize: 18,
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  pickerWrapper: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 1,
    alignItems: 'center',
    width: width * 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeDefaultProfile: {
    position: 'absolute',
    right: 12, // 오른쪽으로 이동
    top: '80%',
    transform: [{ translateY: -12 }],
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#C9C9C9', // 반투명 배경
  },
  changeDefaultProfileText: {
    fontSize: 10, // 작고 잘 안 보이게
    color: '#fff',
    textAlign: 'center',
  },
  modalOption: {
    fontSize: 18,
    marginVertical: 10,
    color: '#000000',
  },
  modalOptionCancel: {
    fontSize: 18,
    marginVertical: 10,
    color: '#FF6B6B',
  },
});
