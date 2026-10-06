import { Tabs } from 'expo-router';
import { Image, Text, View, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
const { width, height } = Dimensions.get('window');
import colors from '../styles/colors';
import * as Notifications from 'expo-notifications';
import React, { useState, useEffect } from 'react';


export default function TabsLayout() {
  const insets = useSafeAreaInsets(); // 안전 영역 값 가져오기
  const navigation = useNavigation();
  const [unreadCount, setUnreadCount] = useState(0);
  
  // 현재 알림 뱃지 개수 가져오기
  const fetchBadgeCount = async () => {
    const badgeCount = await Notifications.getBadgeCountAsync(); // 현재 뱃지 개수 가져오기
    setUnreadCount(badgeCount);
    //console.log("업데이트함 현재 뱃지:", badgeCount);
  };

  useEffect(() => {
    fetchBadgeCount(); // 초기 로드 시 실행

    const interval = setInterval(fetchBadgeCount, 10000); // 10초마다 업데이트
    return () => clearInterval(interval);
  }, []);
  
  // 🔹 앱이 포커스될 때마다 최신 뱃지 업데이트
  useFocusEffect(() => {
    fetchBadgeCount();
  });

  // 🔹 푸시 알림을 감지하여 안드로이드에서만 뱃지 카운트 증가
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => {
      if (Platform.OS === 'android') {
        setUnreadCount((prev) => {
          const newCount = prev + 1;
          Notifications.setBadgeCountAsync(newCount); // 배지 숫자 업데이트
          return newCount;
        });
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: 'left', // 타이틀 중앙 정렬
        tabBarLabelStyle: {
          fontSize: Platform.OS === 'android' ? 14 : 14, // 왼쪽이 android 오른쪽이 ios
          fontWeight: Platform.OS === 'android' ? 'bold' : 'bold',
        },
        tabBarItemStyle: {
          paddingTop: Platform.OS === 'android' ? 10 : 5,
          borderTopWidth: Platform.OS === 'android' ? 0.3 : 0.3,
          borderTopColor: '#ddd',
        },
        headerStyle: {
          height: Platform.OS === 'android' ? 95 : 110, // 헤더 높이 조정
          borderBottomWidth: Platform.OS === 'android' ? 0.8 : 0.8,
          borderColor: '#ddd',
          backgroundColor: '#fff',
        },
        //headerLeft: () => (
         // <Image
         //   source={require('../../assets/images/appLogo.png')} // 로고 이미지 경로
         //   style={{
          //     width: Platform.OS === 'android' ? 50 : height * 0.058, 
         //      height: Platform.OS === 'android' ? 50 : height * 0.058, 
         //      marginLeft: Platform.OS === 'android' ? 10 : 10, 
         //      marginBottom: Platform.OS === 'android' ? 0 : height * 0.005,
        //      }}
        //  />
       // ),
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
            <TouchableOpacity onPress={() => navigation.navigate('CashScreen')}>
              <Image
                source={require('../../assets/images/candy.png')}
                style={{ 
                  width: Platform.OS === 'android' ? 27 : 27, 
                  height: Platform.OS === 'android' ? 27 : 27, 
                  marginRight: Platform.OS === 'android' ? 4 : 4, 
                  marginBottom: Platform.OS === 'android' ? 0 : 5,
                  marginTop: Platform.OS === 'android' ? 12 : 0,
                }}
              />
            </TouchableOpacity>
          </View>
        ),
        headerTitleStyle: {
          fontSize: Platform.OS === 'android' ? 22 : 23, // 타이틀 텍스트 크기
          //fontFamily: Platform.OS === 'android' ? 'TmoneyRoundWindExtraBold' : 'TmoneyRoundWind-Regular',
          marginBottom: Platform.OS === 'android' ? 0 : 3,
          marginLeft: Platform.OS === 'android' ? 2 : 4,
          marginTop: Platform.OS === 'android' ? 12 : 0,
          color: '#363646',
        },
        tabBarStyle: {
          paddingBottom: Platform.OS === 'android' ? insets.bottom + 10 : 27, // 추가 패딩
          height: Platform.OS === 'android' ? 53 : 80,
          
        },
        
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '피드',
          headerStyle: {
            height: Platform.OS === 'android' ? 95 : 110,
            backgroundColor: '#fff',
            borderBottomWidth: 0, // 피드 탭 헤더에 border 제거
            shadowColor: Platform.OS === 'android' ? 'transparent' : 'transparent', // 그림자 제거
          },
          tabBarIcon: ({ focused }) => (
            <Image
              source={
                focused
                  ? require('../../assets/images/talk2.png')
                  : require('../../assets/images/talk.png')
              }
              style={{ 
                width: Platform.OS === 'android' ? 27 : 29, 
                height: Platform.OS === 'android' ? 27 : 29, 
              }}
            />
          ),
          tabBarLabel: ({ focused }) => (
            <Text style={{ 
              color: focused ? colors.main : '#A9A9A9', 
              fontSize: Platform.OS === 'android' ? 12 : 13, 
              fontWeight: Platform.OS === 'android' ? 'bold' : 'bold', 
              marginBottom: Platform.OS === 'android' ? -7 : -3,
            }}>
              피드
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          title: '친구',
          headerStyle: {
            height: Platform.OS === 'android' ? 95 : 110,
            backgroundColor: '#fff',
            borderBottomWidth: 0, // 피드 탭 헤더에 border 제거
            shadowColor: Platform.OS === 'android' ? 'transparent' : 'transparent', // 그림자 제거
          },
          tabBarIcon: ({ focused }) => (
            <Image
              source={
                focused
                  ? require('../../assets/images/near2.png')
                  : require('../../assets/images/near.png')
              }
              style={{ 
                width: Platform.OS === 'android' ? 25 : 29, 
                height: Platform.OS === 'android' ? 25 : 29, 
              }}
            />
          ),
          tabBarLabel: ({ focused }) => (
            <Text style={{ 
              color: focused ? colors.main : '#A9A9A9', 
              fontSize: Platform.OS === 'android' ? 12 : 13, 
              fontWeight: Platform.OS === 'android' ? 'bold' : 'bold', 
              marginBottom: Platform.OS === 'android' ? -7 : -3,
              }}>
              친구
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="meeting"
        options={{
          title: '모임',
          headerStyle: {
            height: Platform.OS === 'android' ? 95 : 110,
            backgroundColor: '#fff',
            borderBottomWidth: 0, // 피드 탭 헤더에 border 제거
            shadowColor: Platform.OS === 'android' ? 'transparent' : 'transparent', // 그림자 제거
          },
          tabBarIcon: ({ focused }) => (
            <Image
              source={
                focused
                  ? require('../../assets/images/meeting2.png')
                  : require('../../assets/images/meeting.png')
              }
              style={{ 
                width: Platform.OS === 'android' ? 25 : 29, 
                height: Platform.OS === 'android' ? 25 : 29, 
              }}
            />
          ),
          tabBarLabel: ({ focused }) => (
            <Text style={{ 
              color: focused ? colors.main : '#A9A9A9', 
              fontSize: Platform.OS === 'android' ? 12 : 13, 
              fontWeight: Platform.OS === 'android' ? 'bold' : 'bold', 
              marginBottom: Platform.OS === 'android' ? -7 : -3,
              }}>
              모임
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: '쪽지',
          tabBarIcon: ({ focused }) => (
            <View style={{ position: 'relative' }}>
              <Image
                source={
                  focused
                    ? require('../../assets/images/message2.png')
                    : require('../../assets/images/message.png')
                }
                style={{ 
                  width: Platform.OS === 'android' ? 25 : 25,
                  height: Platform.OS === 'android' ? 28 : 28,
                  resizeMode: 'stretch',
                }}
              />
              {/* 뱃지 표시 (탭이 비활성화 상태일 때만) */}
              {!focused && unreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  backgroundColor: 'red',
                  borderRadius: 10,
                  width: 12,
                  height: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                    
                  </Text>
                </View>
              )}
            </View>
          ),
          tabBarLabel: ({ focused }) => (
            <Text style={{ 
              color: focused ? colors.main : '#A9A9A9', 
              fontSize: Platform.OS === 'android' ? 12 : 13, 
              fontWeight: 'bold', 
              marginBottom: Platform.OS === 'android' ? -7 : -3,
            }}>
              쪽지
            </Text>
          ),
        }}
      />
    
      <Tabs.Screen
        name="more"
        options={{
          title: '더보기',
          tabBarIcon: ({ focused }) => (
            <Image
              source={
                focused
                  ? require('../../assets/images/moreImage2.png')
                  : require('../../assets/images/moreImage.png')
              }
              style={{ 
                width: Platform.OS === 'android' ? 26 : 27, 
                height: Platform.OS === 'android' ? 26 : 27,
                marginTop: Platform.OS === 'android' ? 0 : 2,
                marginRight: Platform.OS === 'android' ? 0 : 3,
              }}
            />
          ),
          tabBarLabel: ({ focused }) => (
            <Text style={{ 
                color: focused ? colors.main : '#A9A9A9', 
                fontSize: Platform.OS === 'android' ? 12 : 13, 
                fontWeight: Platform.OS === 'android' ? 'bold' : 'bold', 
                marginBottom: Platform.OS === 'android' ? -7 : -3,  
                //marginLeft: Platform.OS === 'android' ? 2 : 2,
            }}>
              더보기
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}
