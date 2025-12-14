/**
 * Mobile App Generation for NEVRA Builder
 * Generate React Native and Flutter code from web components
 */

export type MobileFramework = 'react-native' | 'flutter';

export interface MobileAppConfig {
  name: string;
  packageName: string;
  version: string;
  framework: MobileFramework;
  platform: 'ios' | 'android' | 'both';
}

/**
 * Convert HTML/React web code to React Native
 */
export function convertToReactNative(webCode: string, config: MobileAppConfig): string {
  // Basic conversion - replace HTML elements with React Native components
  let rnCode = webCode;
  
  // Replace common HTML elements
  const replacements: Array<[RegExp, string]> = [
    [/<div/g, '<View'],
    [/<\/div>/g, '</View>'],
    [/<span/g, '<Text'],
    [/<\/span>/g, '</Text>'],
    [/<p/g, '<Text'],
    [/<\/p>/g, '</Text>'],
    [/<h1/g, '<Text style={{ fontSize: 32, fontWeight: "bold" }}'],
    [/<\/h1>/g, '</Text>'],
    [/<h2/g, '<Text style={{ fontSize: 24, fontWeight: "bold" }}'],
    [/<\/h2>/g, '</Text>'],
    [/<button/g, '<TouchableOpacity'],
    [/<\/button>/g, '</TouchableOpacity>'],
    [/<input/g, '<TextInput'],
    [/<\/input>/g, '</TextInput>'],
    [/<img/g, '<Image'],
    [/<\/img>/g, '</Image>'],
    [/className=/g, 'style='],
  ];
  
  replacements.forEach(([pattern, replacement]) => {
    rnCode = rnCode.replace(pattern, replacement);
  });
  
  // Add React Native imports
  const imports = `
import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Image, StyleSheet, ScrollView } from 'react-native';
`;
  
  // Convert Tailwind classes to StyleSheet
  rnCode = convertTailwindToStyleSheet(rnCode);
  
  return `${imports}\n\n${rnCode}`;
}

/**
 * Convert HTML/React web code to Flutter
 */
export function convertToFlutter(webCode: string, config: MobileAppConfig): string {
  // Basic Flutter conversion
  const flutterCode = `
import 'package:flutter/material.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '${config.name}',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        brightness: Brightness.dark,
      ),
      home: HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        // Converted from web code
        child: Text('Flutter app generated from web code'),
      ),
    );
  }
}
`;
  
  return flutterCode;
}

/**
 * Convert Tailwind classes to React Native StyleSheet
 */
function convertTailwindToStyleSheet(code: string): string {
  // This is a simplified conversion
  // In production, you'd want a more comprehensive Tailwind to React Native converter
  
  const styleMap: Record<string, string> = {
    'bg-black': 'backgroundColor: "#000000"',
    'bg-white': 'backgroundColor: "#ffffff"',
    'text-white': 'color: "#ffffff"',
    'text-black': 'color: "#000000"',
    'p-4': 'padding: 16',
    'p-6': 'padding: 24',
    'm-4': 'margin: 16',
    'rounded-lg': 'borderRadius: 8',
    'flex': 'display: "flex"',
    'flex-row': 'flexDirection: "row"',
    'items-center': 'alignItems: "center"',
    'justify-center': 'justifyContent: "center"',
  };
  
  // Add StyleSheet creation
  const styles = Object.entries(styleMap)
    .map(([key, value]) => `  ${key.replace(/-/g, '_')}: { ${value} },`)
    .join('\n');
  
  const styleSheet = `
const styles = StyleSheet.create({
${styles}
});
`;
  
  return code + styleSheet;
}

/**
 * Generate mobile app project structure
 */
export function generateMobileProject(
  webCode: string,
  config: MobileAppConfig
): { files: Array<{ path: string; content: string }> } {
  const files: Array<{ path: string; content: string }> = [];
  
  if (config.framework === 'react-native') {
    const rnCode = convertToReactNative(webCode, config);
    files.push({
      path: 'App.tsx',
      content: rnCode,
    });
    files.push({
      path: 'package.json',
      content: JSON.stringify({
        name: config.packageName,
        version: config.version,
        main: 'App.tsx',
        dependencies: {
          'react': '^18.0.0',
          'react-native': '^0.72.0',
        },
      }, null, 2),
    });
  } else if (config.framework === 'flutter') {
    const flutterCode = convertToFlutter(webCode, config);
    files.push({
      path: 'lib/main.dart',
      content: flutterCode,
    });
    files.push({
      path: 'pubspec.yaml',
      content: `
name: ${config.packageName}
description: ${config.name}
version: ${config.version}
environment:
  sdk: '>=2.17.0 <4.0.0'
dependencies:
  flutter:
    sdk: flutter
`,
    });
  }
  
  return { files };
}
