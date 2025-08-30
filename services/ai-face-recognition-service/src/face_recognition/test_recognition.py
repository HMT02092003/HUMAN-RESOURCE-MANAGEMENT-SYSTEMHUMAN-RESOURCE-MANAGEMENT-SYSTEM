#!/usr/bin/env python3
"""
Test script for face recognition system
"""

import sys
import os
import json
sys.path.append(os.path.dirname(__file__))

from detect import detect_face
from embedding_face import get_feature
import cv2
import numpy as np

def test_face_detection(image_path):
    """
    Test face detection functionality
    """
    print(f"Testing face detection on: {image_path}")
    
    try:
        faces = detect_face(image_path)
        print(f"Detected {len(faces)} faces")
        
        for i, face in enumerate(faces):
            print(f"Face {i+1}: bbox = {face['bbox']}")
            
        return len(faces) > 0
        
    except Exception as e:
        print(f"Error in face detection: {e}")
        return False

def test_feature_extraction(image_path):
    """
    Test feature extraction functionality
    """
    print(f"Testing feature extraction on: {image_path}")
    
    try:
        faces = detect_face(image_path)
        if not faces:
            print("No faces detected for feature extraction")
            return False
            
        face_image = faces[0]['face_image']
        features = get_feature(face_image)
        
        if features is not None:
            print(f"Extracted features shape: {features.shape}")
            print(f"Feature norm: {np.linalg.norm(features):.4f}")
            return True
        else:
            print("Failed to extract features")
            return False
            
    except Exception as e:
        print(f"Error in feature extraction: {e}")
        return False

def test_recognition_pipeline(image_path):
    """
    Test complete recognition pipeline
    """
    print(f"Testing recognition pipeline on: {image_path}")
    
    try:
        # Step 1: Face detection
        faces = detect_face(image_path)
        if not faces:
            return {
                'success': False,
                'message': 'No faces detected'
            }
        
        # Step 2: Feature extraction
        face_image = faces[0]['face_image']
        features = get_feature(face_image)
        
        if features is None:
            return {
                'success': False,
                'message': 'Feature extraction failed'
            }
        
        return {
            'success': True,
            'message': 'Pipeline completed successfully',
            'num_faces': len(faces),
            'feature_shape': features.shape,
            'bbox': faces[0]['bbox']
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'Error: {str(e)}'
        }

def main():
    """
    Main test function
    """
    print("Face Recognition System Test")
    print("=" * 40)
    
    # Test với ảnh mẫu
    test_images = [
        "../../Face_Recognition/data/B21DCCN180.jpg",
        "../../Face_Recognition/data/B21DCCN670.jpg",
        "../../Face_Recognition/data/toan.jpg"
    ]
    
    for image_path in test_images:
        if os.path.exists(image_path):
            print(f"\nTesting with: {image_path}")
            print("-" * 30)
            
            # Test detection
            detection_ok = test_face_detection(image_path)
            
            # Test feature extraction
            if detection_ok:
                extraction_ok = test_feature_extraction(image_path)
                
                # Test pipeline
                pipeline_result = test_recognition_pipeline(image_path)
                print(f"Pipeline result: {json.dumps(pipeline_result, indent=2)}")
            
            print("-" * 30)
        else:
            print(f"Image not found: {image_path}")
    
    print("\nTest completed!")

if __name__ == '__main__':
    main()
