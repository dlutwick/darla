import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#18261f',
        tabBarInactiveTintColor: '#4f5c54',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          paddingBottom: 2,
        },
        tabBarStyle: {
          height: 74,
          paddingTop: 8,
          paddingBottom: 10,
          borderTopColor: '#c4d0c6',
          backgroundColor: '#f7fbf7',
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sale"
        options={{
          title: 'Add Sale',
          tabBarIcon: ({ color, size }) => <Ionicons name="cash-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="product"
        options={{
          title: 'Add Product',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="giveaways"
        options={{
          title: 'Giveaways',
          tabBarIcon: ({ color, size }) => <Ionicons name="gift-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="money"
        options={{
          title: 'Money',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="top-items"
        options={{
          title: 'Top Items',
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="summary"
        options={{
          title: 'Summary',
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <Ionicons name="download-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="orders" options={{ href: null }} />
      <Tabs.Screen name="helper-commission" options={{ href: null }} />
      <Tabs.Screen name="product-audit" options={{ href: null }} />
      <Tabs.Screen name="bakery" options={{ href: null }} />
      <Tabs.Screen name="crafts" options={{ href: null }} />
      <Tabs.Screen name="index" options={{ href: null, title: '' }} />
      <Tabs.Screen name="food" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="progress" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="onboarding" options={{ href: null }} />
      <Tabs.Screen name="plan" options={{ href: null }} />
      <Tabs.Screen name="weight" options={{ href: null }} />
      <Tabs.Screen name="weight-log" options={{ href: null }} />
      <Tabs.Screen name="workout" options={{ href: null }} />
    </Tabs>
  );
}
