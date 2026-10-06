import { Stack } from 'expo-router';
import React from 'react';



export default function Layout() {
  return (
      <Stack initialRouteName="index">
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="PermissionScreen" options={{ headerShown: false }} />
        <Stack.Screen name="AgreementScreen" options={{ headerShown: false }} />
        <Stack.Screen name="LoginScreen" options={{ headerShown: false }} />
        <Stack.Screen name="ProfileScreen" options={{ headerShown: false }} />
        <Stack.Screen
          name="TermsOfServiceScreen"
          options={{ headerShown: true, presentation: 'modal', headerTitle: '약관 동의' }}
        />
        <Stack.Screen
          name="LocationServiceScreen"
          options={{ headerShown: true, presentation: 'modal', headerTitle: '약관 동의' }}
        />
        <Stack.Screen
          name="PrivacyPolicyScreen"
          options={{ headerShown: true, presentation: 'modal', headerTitle: '약관 동의' }}
        />
        <Stack.Screen
          name="PrivacyUseScreen"
          options={{ headerShown: true, presentation: 'modal', headerTitle: '약관 동의' }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="WriteScreen"
          options={{
            headerTitle: '글쓰기',
            headerBackTitle: '뒤로가기',
            headerTitleAlign: 'center'
          }}
        />
        <Stack.Screen
          name="WriteMeetingScreen"
          options={{
            headerTitle: '모임생성',
            headerBackTitle: '뒤로가기',
            headerTitleAlign: 'center'
          }}
        />
        <Stack.Screen name="SanctionScreen" options={{ headerShown: false }} />
        <Stack.Screen name="BlockedUsersScreen" options={{ headerTitle: '차단목록', headerBackTitle: '뒤로가기', headerTitleAlign: 'center' }} />
        <Stack.Screen name="ChattingScreen" options={{ headerShown: false }} />
        <Stack.Screen name="ChattingMeetingScreen" options={{ headerShown: false }} />
        <Stack.Screen name="CashScreen" options={{ headerTitle: '캔디 스토어', headerBackTitle: '뒤로가기', headerTitleAlign: 'center' }} />
        <Stack.Screen name="CallCenterScreen" options={{ headerTitle: '문의하기', headerBackTitle: '뒤로가기', headerTitleAlign: 'center' }} />
        <Stack.Screen name="InfoScreen" options={{ headerTitle: '이용안내', headerBackTitle: '뒤로가기', headerTitleAlign: 'center' }} />
        <Stack.Screen name="SettingScreen" options={{ headerTitle: '설정', headerBackTitle: '뒤로가기', headerTitleAlign: 'center' }} />
        <Stack.Screen name="ProfileViewScreen" options={{ headerShown: false }} />
        <Stack.Screen name="MeetingViewScreen" options={{ headerTitle: '', headerBackTitle: '뒤로가기', headerTitleAlign: 'center' }} />
        <Stack.Screen name="InterestSelectionScreen" options={{ headerShown: false }} />
        <Stack.Screen name="NoticeScreen" options={{ headerTitle: '공지사항', headerBackTitle: '뒤로가기', headerTitleAlign: 'center' }} />
        <Stack.Screen name="SearchLocation" options={{ headerTitle: '지역 선택', headerBackTitle: '뒤로가기', headerTitleAlign: 'center' }} />
      </Stack>

    
  );
}
