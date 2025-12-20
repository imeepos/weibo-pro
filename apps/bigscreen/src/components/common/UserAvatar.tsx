import React from 'react';
import { Users } from 'lucide-react';
import type { UserProfile } from '@/types';

interface UserAvatarProps {
  user: Pick<UserProfile, 'avatar' | 'nickname'>;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
};

const iconSizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 'sm' }) => {
  const [imageError, setImageError] = React.useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  if (!user.avatar || imageError) {
    return (
      <div className={`${sizeClasses[size]} bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center`}>
        <Users className={`${iconSizeClasses[size]} icon-on-colored-bg`} />
      </div>
    );
  }

  return (
    <img
      src={user.avatar}
      alt={`${user.nickname}的头像`}
      className={`${sizeClasses[size]} rounded-full object-cover border-2 border-border`}
      loading="lazy"
      onError={handleImageError}
    />
  );
};
