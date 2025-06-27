import React from 'react';
import { View } from 'react-native';

// Composant Spacer pour les espacements verticaux et horizontaux
interface SpacerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  direction?: 'vertical' | 'horizontal';
}

export function Spacer({ size = 'md', direction = 'vertical' }: SpacerProps) {
  const getSpacing = () => {
    if (typeof size === 'number') {
      return size;
    }
    
    switch (size) {
      case 'xs': return 4;
      case 'sm': return 8;
      case 'md': return 16;
      case 'lg': return 24;
      case 'xl': return 32;
      default: return 16;
    }
  };

  const spacing = getSpacing();
  
  return (
    <View 
      style={{
        width: direction === 'horizontal' ? spacing : undefined,
        height: direction === 'vertical' ? spacing : undefined,
      }} 
    />
  );
}

// Composant VStack pour empiler verticalement avec espacement
interface VStackProps {
  children: React.ReactNode;
  spacing?: SpacerProps['size'];
  className?: string;
}

export function VStack({ children, spacing = 'md', className }: VStackProps) {
  const childrenArray = React.Children.toArray(children);
  
  return (
    <View className={className}>
      {childrenArray.map((child, index) => (
        <React.Fragment key={index}>
          {child}
          {index < childrenArray.length - 1 && (
            <Spacer size={spacing} direction="vertical" />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

// Composant HStack pour aligner horizontalement avec espacement
interface HStackProps {
  children: React.ReactNode;
  spacing?: SpacerProps['size'];
  className?: string;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
}

export function HStack({ 
  children, 
  spacing = 'md', 
  className,
  align = 'center',
  justify = 'start'
}: HStackProps) {
  const childrenArray = React.Children.toArray(children);
  
  const getAlignItems = () => {
    switch (align) {
      case 'start': return 'flex-start';
      case 'center': return 'center';
      case 'end': return 'flex-end';
      case 'stretch': return 'stretch';
      default: return 'center';
    }
  };
  
  const getJustifyContent = () => {
    switch (justify) {
      case 'start': return 'flex-start';
      case 'center': return 'center';
      case 'end': return 'flex-end';
      case 'between': return 'space-between';
      case 'around': return 'space-around';
      case 'evenly': return 'space-evenly';
      default: return 'flex-start';
    }
  };
  
  return (
    <View 
      className={`flex-row ${className || ''}`}
      style={{
        alignItems: getAlignItems(),
        justifyContent: getJustifyContent(),
      }}
    >
      {childrenArray.map((child, index) => (
        <React.Fragment key={index}>
          {child}
          {index < childrenArray.length - 1 && (
            <Spacer size={spacing} direction="horizontal" />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

// Composant Grid simple pour layouts en grille
interface GridProps {
  children: React.ReactNode;
  columns: number;
  spacing?: SpacerProps['size'];
  className?: string;
}

export function Grid({ children, columns, spacing = 'md', className }: GridProps) {
  const childrenArray = React.Children.toArray(children);
  const rows: React.ReactNode[][] = [];
  
  // Grouper les enfants par lignes
  for (let i = 0; i < childrenArray.length; i += columns) {
    rows.push(childrenArray.slice(i, i + columns));
  }
  
  return (
    <VStack spacing={spacing} className={className}>
      {rows.map((row, rowIndex) => (
        <HStack key={rowIndex} spacing={spacing} className="flex-1">
          {row.map((child, colIndex) => (
            <View key={colIndex} className="flex-1">
              {child}
            </View>
          ))}
          {/* Remplir les colonnes manquantes */}
          {row.length < columns && 
            Array.from({ length: columns - row.length }).map((_, emptyIndex) => (
              <View key={`empty-${emptyIndex}`} className="flex-1" />
            ))
          }
        </HStack>
      ))}
    </VStack>
  );
}