import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions, TouchableWithoutFeedback } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import colors from './styles/colors';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export default function FilterBar({ applyFilters, showWriteButton = true }) {
  // 정렬 상태 (기본값: 'time')
  const [sort, setSort] = useState('time');
  // 성별 드롭다운 상태
  const [genderOpen, setGenderOpen] = useState(false);
  const [gender, setGender] = useState('all'); // 기본값 전체
	const [tempAgeRange, setTempAgeRange] = useState([20, 100]); // 슬라이더 임시 값
	// 나이 범위 상태
  const [ageRange, setAgeRange] = useState([20, 100]);
  // 나이 슬라이더 표시 여부
  const [showAgeSlider, setShowAgeSlider] = useState(false);
  const navigation = useNavigation();

  const [genderItems, setGenderItems] = useState([
    { label: '전체성별', value: 'all' },
    { label: '남자', value: 'male' },
    { label: '여자', value: 'female' },
  ]);

	const applyAgeRange = () => {
    setAgeRange(tempAgeRange);
    setShowAgeSlider(false); // 슬라이더 닫기
  };

	// 슬라이더 값 변경 (임시 상태에 저장)
  const handleTempAgeRangeChange = (values) => {
    setTempAgeRange(values);
  };

	
  const handleWritePress = () => {
    navigation.navigate('WriteScreen');
  };

  // 정렬 버튼을 누르면 거리순 ↔ 최신순 토글
  const handleToggleSort = () => {
    setSort((prevSort) => (prevSort === 'time' ? 'distance' : 'time'));
		if (genderOpen) setGenderOpen(false);
    if (showAgeSlider) setShowAgeSlider(false);
  };

  // 바깥을 터치했을 때 드롭다운과 슬라이더를 닫는 함수
  const handleClose = () => {
    if (genderOpen) setGenderOpen(false);
    if (showAgeSlider) setShowAgeSlider(false);
  };

  // 나이 버튼을 눌렀을 때 동작
  const handleAgeButtonPress = () => {
    // 나이 슬라이더를 열거나 닫기 전에 드롭다운을 닫음
    setGenderOpen(false);
    setShowAgeSlider((prev) => !prev);
  };

  // 드롭다운 열림/닫힘 제어 함수
  const handleSetGenderOpen = (open) => {
    // 드롭다운 열릴 때 나이 슬라이더를 닫음
    if (open) {
      setShowAgeSlider(false);
    }
    setGenderOpen(open);
  };


  // 필터 값이 변경될 때마다 콜백 실행
  useEffect(() => {
    applyFilters?.({ sort, gender, ageRange });
  }, [sort, gender, ageRange]);

  return (
    
		<View style={styles.filterBarContainer}>
			{/* 스크린 전체를 감싸는 투명 배경 */}
      {(genderOpen || showAgeSlider) && (
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}
			{/* 정렬 버튼 */}
			<TouchableOpacity style={styles.blackButton} onPress={handleToggleSort}>
				<Text style={styles.buttonText}>
					{sort === 'time' ? '최신순' : '거리순'}
				</Text>
			</TouchableOpacity>

			{/* 성별 드롭다운 */}
			<View style={[styles.dropdownWrapper, { width: gender === 'all' ? 70 : 50}]}>
				<DropDownPicker
					open={genderOpen}
					setOpen={handleSetGenderOpen}
					value={gender}
					setValue={setGender}
					items={genderItems}
					setItems={setGenderItems}
					placeholder="전체성별"
					containerStyle={styles.dropdownContainer}
					style={[styles.dropdown, { width: gender === 'all' ? 70 : 47, borderWidth: 0 }]} // 동적으로 width 설정
					dropDownContainerStyle={[styles.dropdownInner, { width: 90 }]}

					selectedItemLabelStyle={{
						color: colors.main, // 선택된 항목의 텍스트 색상
						fontWeight: 'bold', // 강조 스타일
					}}
					textStyle={styles.dropdownText}
					// 플레이스홀더 색상만 흰색으로
					placeholderStyle={styles.dropdownPlaceholder}
					tickIconStyle={{
						display: 'none', // V 표시 숨기기
					}}
					tickIconContainerStyle={{
						display: 'none', // V 표시 숨기기
					}}
					arrowIconStyle={styles.arrowHidden}
					arrowIconContainerStyle={styles.arrowHidden}
					labelStyle={{
						color: '#FFFFFF',
						fontSize: Platform.OS === 'android' ? 12 : 13,
						fontWeight: Platform.OS === 'android' ? '500' : '700',
						textAlign: 'center',
            letterSpacing: 0.3,
					}}
				/>
			</View>

			{/* 나이 버튼 (슬라이더 표시 토글) */}
			<TouchableOpacity style={styles.blackButton} onPress={handleAgeButtonPress}>
				<Text style={styles.buttonText}>나이</Text>
			</TouchableOpacity>

      {/* 글쓰기 버튼을 조건부로 표시 */}
			{showWriteButton && (
        <TouchableOpacity style={styles.writeButton} onPress={handleWritePress}>
          <Text style={styles.writeButtonText}>글쓰기</Text>
        </TouchableOpacity>
      )}

			{/* 나이 슬라이더 영역 */}
			{showAgeSlider && (
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderTitle}>나이</Text>
          <MultiSlider
            values={tempAgeRange}
            onValuesChange={handleTempAgeRangeChange}
            min={19}
            max={100}
            step={1}
            selectedStyle={{ backgroundColor: colors.main }}
            markerStyle={{ borderWidth: 1, borderColor: '#B5B5B5', backgroundColor: '#fff' }}
          />
          <Text style={styles.sliderValue}>
            {tempAgeRange[0]}살 ~ {tempAgeRange[1]}살
          </Text>
          <TouchableOpacity style={styles.applyButton} onPress={applyAgeRange}>
            <Text style={styles.applyButtonText}>적용</Text>
          </TouchableOpacity>
        </View>
      )}
		</View>
    
  );
}

const styles = StyleSheet.create({
  /* 하단 필터 바 컨테이너 */
  filterBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // 왼쪽 정렬
    justifyContent: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingBottom: 7,
		paddingTop: Platform.OS === 'android' ? 5 : 0,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    // 전체 왼쪽에 조금의 공백을 주고 싶다면 (없애려면 0으로)
    paddingLeft: 10,
    position: 'absolute',
    top:0,
    width: '100%',
  },
  overlay: {
    position: 'absolute',
    width: 30000,
		height: 30000,
    backgroundColor: 'rgba(0, 0, 0, 0)', // 투명 배경
    zIndex: 2, // 다른 요소보다 위에 표시
  },
  /* 공통 검정 버튼 스타일 (정렬, 나이 버튼) */
  blackButton: {
    backgroundColor: '#111',
    borderRadius: 13,  // 타원형
    height: 25,        // 다른 필터와 동일 높이
    paddingHorizontal: 12,
    marginRight: 5,   // 버튼 사이 간격
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: Platform.OS === 'android' ? 12 : 13,
    fontWeight: Platform.OS === 'android' ? '500' : '700',
    letterSpacing: 0.1,
  },

  /* 드롭다운 감싸는 래퍼 */
  dropdownWrapper: {
    // 나란히 배치 시, 오른쪽으로 간격을 주기 위해 marginRight 사용
    marginRight: 5,
    height: 25,
    //width: 50,
    justifyContent: 'center',
		zIndex: 3,
  },
  /* DropDownPicker 관련 스타일 */
  dropdownContainer: {
    height: 25,
    justifyContent: 'center',

  },
  dropdown: {
    backgroundColor: '#111',
    borderColor: '#000',
    borderRadius: 13,
    minHeight: 25,
    //width: 70,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  dropdownInner: {
    borderColor: '#fff',
    shadowColor: '#000', // 그림자 색상
    shadowOffset: { width: 0, height: 2 }, // 그림자 위치
    shadowOpacity: 0.25, // 그림자 투명도
    shadowRadius: 3.84, // 그림자 퍼짐 정도
    elevation: 5, // 안드로이드용 그림자
		backgroundColor: '#FAFAFA',
  },
  // 드롭다운 선택된 텍스트 색상: 검정
  dropdownText: {
    color: '#141414',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
		letterSpacing: 0.4,
  },
  // ▼ 플레이스홀더만 흰색으로 (예: '전체성별' 표기)
  dropdownPlaceholder: {
    fontSize: 12,
    color: '#fff',
  },
  arrowHidden: {
    display: 'none',
    width: 0,
    height: 0,
		
  },
	applyButton: {
    marginTop: 5,
    backgroundColor: colors.main,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
		alignSelf: 'flex-end',
		marginRight: 5,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  /* 나이 슬라이더 영역 */
  sliderContainer: {
    position: 'absolute',
    //bottom: 0, // 상황에 맞게 조정
    left: 0,
    right: 0,
    top:35,
    padding: 10,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1.5,
    borderBottomColor: '#ddd',
    alignItems: 'center',
		zIndex: 3,
  },
  sliderTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: -3,
		color: '#141414',
		fontFamily: Platform.OS === 'android' ? 'TmoneyRoundWindRegular' : 'TmoneyRoundWind-Regular',
  },
  sliderValue: {
    marginTop: 4,
    fontSize: 15,
		color: '#141414',
		fontFamily: Platform.OS === 'android' ? 'TmoneyRoundWindRegular' : 'TmoneyRoundWind-Regular',
  },
	writeButton: {
		position: 'absolute',
		right: 10, // 오른쪽 여백
		top: Platform.OS === 'android' ? 5 : 0,
		backgroundColor: '#FF94AC',
		height: 25,        // 다른 필터와 동일 높이
    paddingHorizontal: 12,
		borderRadius: 5,
		justifyContent: 'center',
	},
	writeButtonText: {
		color: '#fff',
		fontSize: Platform.OS === 'android' ? 12 : 13,
    fontWeight: Platform.OS === 'android' ? '500' : '700',
		
	},
	
});
