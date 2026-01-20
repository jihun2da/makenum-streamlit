# -*- coding: utf-8 -*-
"""
애플리케이션 설정
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Streamlit secrets 지원
try:
    import streamlit as st
    if hasattr(st, 'secrets'):
        _secrets = st.secrets
    else:
        _secrets = {}
except:
    _secrets = {}

class Config:
    """기본 설정"""
    SECRET_KEY = _secrets.get('SECRET_KEY', os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production'))
    
    # MariaDB 연결 설정 (Streamlit secrets 우선)
    DB_HOST = _secrets.get('DB_HOST', os.getenv('DB_HOST', 'localhost'))
    DB_PORT = _secrets.get('DB_PORT', os.getenv('DB_PORT', '3306'))
    DB_USER = _secrets.get('DB_USER', os.getenv('DB_USER', 'root'))
    DB_PASSWORD = _secrets.get('DB_PASSWORD', os.getenv('DB_PASSWORD', ''))
    DB_NAME = _secrets.get('DB_NAME', os.getenv('DB_NAME', 'order_management'))
    
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        f"?charset=utf8mb4"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False  # True로 설정하면 SQL 쿼리 로그 출력
    
    # 업로드 설정
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    ALLOWED_EXTENSIONS = {'xlsx', 'xls'}
    
    # 페이지네이션
    ITEMS_PER_PAGE = 50

class DevelopmentConfig(Config):
    """개발 환경 설정"""
    DEBUG = True
    SQLALCHEMY_ECHO = True

class ProductionConfig(Config):
    """프로덕션 환경 설정"""
    DEBUG = False
    SQLALCHEMY_ECHO = False
    
    # 프로덕션에서는 환경 변수 필수
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

class TestConfig(Config):
    """테스트 환경 설정"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

# 환경별 설정 매핑
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'test': TestConfig,
    'default': DevelopmentConfig
}






