import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Profile.css';

const EMOJIS = ['😎', '🚗', '🚀', '🌟', '🦄', '🍎', '🍕', '🎉', '✈️', '🐶'];

export default function Profile() {
  const { user, userProfile, updateProfile } = useAuth();
  const [name, setName] = useState(userProfile.name);
  const [selectedEmoji, setSelectedEmoji] = useState(userProfile.emoji);
  const [isEditing, setIsEditing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSave = () => {
    updateProfile({ name, emoji: selectedEmoji });
    setIsEditing(false);
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-image-section">
            <div className="profile-emoji" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
              {selectedEmoji}
              <div className="edit-badge">✎</div>
            </div>
            {showEmojiPicker && (
              <div className="emoji-picker">
                {EMOJIS.map(emoji => (
                  <span 
                    key={emoji} 
                    className="emoji-option" 
                    onClick={() => { setSelectedEmoji(emoji); setShowEmojiPicker(false); }}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
            )}
          </div>
          <h1>{isEditing ? 'Edit Profile' : 'Your Profile'}</h1>
        </div>

        <div className="profile-form">
          <div className="form-group">
            <label>Full Name</label>
            {isEditing ? (
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Enter your name"
              />
            ) : (
              <p className="display-text">{name}</p>
            )}
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <p className="display-text readonly-email">{user?.email}</p>
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <p className="display-text">+91 98765 43210</p>
          </div>

          <div className="profile-actions">
            {isEditing ? (
              <>
                <button className="save-btn" onClick={handleSave}>Save Changes</button>
                <button className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
              </>
            ) : (
              <button className="edit-btn" onClick={() => setIsEditing(true)}>Edit Profile</button>
            )}
          </div>
        </div>
      </div>

      <div className="profile-extras">
        <div className="extra-card">
          <h3>Member Since</h3>
          <p>October 2025</p>
        </div>
        <div className="extra-card">
          <h3>Total Rides</h3>
          <p>42</p>
        </div>
        <div className="extra-card">
          <h3>Rating</h3>
          <p>4.9 ⭐</p>
        </div>
      </div>
    </div>
  );
}
