# -*- coding: utf-8 -*-
"""
Flask 애플리케이션 팩토리
"""
import os
from flask import Flask
from flask_cors import CORS
from app.config import config
from app.models import db

def create_app(config_name='default'):
    """Flask 애플리케이션 생성"""
    app = Flask(__name__)
    
    # 설정 로드
    app.config.from_object(config[config_name])
    
    # CORS 설정
    CORS(app)
    
    # 데이터베이스 초기화
    db.init_app(app)
    
    # 업로드 폴더 생성
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # 블루프린트 등록
    from app.routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # 헬스 체크 엔드포인트
    @app.route('/health')
    def health_check():
        return {'status': 'healthy'}, 200
    
    # 메인 페이지 (엑셀 스타일)
    @app.route('/')
    def index():
        from flask import render_template
        return render_template('excel_view.html')
    
    # 엑셀 뷰
    @app.route('/excel_view')
    def excel_view():
        from flask import render_template
        return render_template('excel_view.html')
    
    # 기존 대시보드 (필요시)
    @app.route('/dashboard')
    def dashboard():
        from flask import render_template
        return render_template('index.html')
    
    # 데이터베이스 테이블 생성
    with app.app_context():
        db.create_all()
    
    return app

