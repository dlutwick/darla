import { ExpoRoot } from 'expo-router';

type RequireWithContext = NodeRequire & {
  context: (path: string, deep?: boolean, filter?: RegExp) => any;
};

export default function App() {
  const ctx = (require as RequireWithContext).context('./app');
  return <ExpoRoot context={ctx as any} />;
}
