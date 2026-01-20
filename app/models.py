# -*- coding: utf-8 -*-
"""
데이터베이스 모델
"""
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Manager(db.Model):
    """담당자 모델"""
    __tablename__ = 'managers'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(10), unique=True, nullable=False, index=True)
    name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계
    orders = db.relationship('Order', backref='manager', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'is_active': self.is_active
        }

class Buyer(db.Model):
    """주문자 모델"""
    __tablename__ = 'buyers'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), index=True)
    member_no = db.Column(db.String(20), index=True)
    name = db.Column(db.String(50), nullable=False, index=True)
    phone = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계
    orders = db.relationship('Order', backref='buyer', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'member_no': self.member_no,
            'name': self.name,
            'phone': self.phone
        }

class Consignor(db.Model):
    """위탁자 모델"""
    __tablename__ = 'consignors'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, index=True)
    full_name = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 관계
    orders = db.relationship('Order', backref='consignor', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'full_name': self.full_name
        }

class Order(db.Model):
    """주문 모델"""
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    order_no = db.Column(db.String(50), unique=True, nullable=False, index=True)
    manager_id = db.Column(db.Integer, db.ForeignKey('managers.id'), nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey('buyers.id'), nullable=False)
    consignor_id = db.Column(db.Integer, db.ForeignKey('consignors.id'))
    order_date = db.Column(db.Date, nullable=False, index=True)
    status = db.Column(db.Enum('입고대기', '입고', '미송', '품절', '교환', '환불', '택배비'), 
                       default='입고대기', index=True)
    total_quantity = db.Column(db.Integer, default=0)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계
    items = db.relationship('OrderItem', backref='order', lazy='dynamic', cascade='all, delete-orphan')
    
    __table_args__ = (
        db.Index('idx_manager_date', 'manager_id', 'order_date'),
    )
    
    def to_dict(self, include_items=False):
        data = {
            'id': self.id,
            'order_no': self.order_no,
            'manager': self.manager.to_dict() if self.manager else None,
            'buyer': self.buyer.to_dict() if self.buyer else None,
            'consignor': self.consignor.to_dict() if self.consignor else None,
            'order_date': self.order_date.isoformat() if self.order_date else None,
            'status': self.status,
            'total_quantity': self.total_quantity,
            'notes': self.notes,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        if include_items:
            data['items'] = [item.to_dict() for item in self.items]
        return data

class OrderItem(db.Model):
    """주문 상품 항목 모델"""
    __tablename__ = 'order_items'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False, index=True)
    product_name = db.Column(db.String(200), nullable=False, index=True)
    quantity = db.Column(db.Integer, default=1)
    color = db.Column(db.String(50))
    status = db.Column(db.Enum('입고대기', '입고', '미송', '품절', '교환', '환불', '택배비'), 
                       default='입고대기', index=True)
    notes = db.Column(db.Text)
    status_history = db.Column(db.Text)  # 상태 변경 이력 (입고대기 → 입고 → 출고)
    change_log = db.Column(db.Text)  # 모든 변경 내용 로그
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'product_name': self.product_name,
            'quantity': self.quantity,
            'color': self.color,
            'status': self.status,
            'notes': self.notes,
            'status_history': self.status_history or self.status,
            'change_log': self.change_log or ''
        }

class ManagerCounter(db.Model):
    """담당자별 누적 순번 카운터 (날짜 무관)"""
    __tablename__ = 'manager_counters'
    
    id = db.Column(db.Integer, primary_key=True)
    manager_id = db.Column(db.Integer, db.ForeignKey('managers.id'), nullable=False, unique=True)
    current_seq = db.Column(db.Integer, default=0)
    
    @classmethod
    def get_next_seq(cls, manager_id):
        """담당자별 다음 순번 가져오기 (누적)"""
        counter = cls.query.filter_by(manager_id=manager_id).first()
        
        if counter:
            counter.current_seq += 1
        else:
            counter = cls(manager_id=manager_id, current_seq=1)
            db.session.add(counter)
        
        db.session.commit()
        return counter.current_seq

class BuyerConsignorCounter(db.Model):
    """주문자+위탁자 조합별 기본 번호 (날짜 무관)"""
    __tablename__ = 'buyer_consignor_counters'
    
    id = db.Column(db.Integer, primary_key=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey('buyers.id'), nullable=False)
    consignor_id = db.Column(db.Integer, db.ForeignKey('consignors.id'))
    manager_code = db.Column(db.String(10), nullable=False)
    base_number = db.Column(db.Integer, nullable=False)  # 543, 544 같은 기본 번호
    
    __table_args__ = (
        db.UniqueConstraint('buyer_id', 'consignor_id', 'manager_code', name='unique_buyer_consignor'),
    )
    
    @classmethod
    def get_base_number(cls, buyer_id, consignor_id, manager_code):
        """주문자+위탁자 조합의 기본 번호 가져오기"""
        # consignor_id가 None일 수도 있으므로 처리
        if consignor_id:
            counter = cls.query.filter_by(
                buyer_id=buyer_id,
                consignor_id=consignor_id,
                manager_code=manager_code
            ).first()
        else:
            counter = cls.query.filter_by(
                buyer_id=buyer_id,
                consignor_id=None,
                manager_code=manager_code
            ).first()
        
        if counter:
            return counter.base_number
        
        # 새 조합이면 새 기본 번호 할당
        # 해당 담당자의 최대 번호 찾기
        max_counter = cls.query.filter_by(manager_code=manager_code).order_by(cls.base_number.desc()).first()
        new_base = (max_counter.base_number + 1) if max_counter else 1
        
        counter = cls(
            buyer_id=buyer_id,
            consignor_id=consignor_id,
            manager_code=manager_code,
            base_number=new_base
        )
        db.session.add(counter)
        db.session.commit()
        
        return new_base

class UploadHistory(db.Model):
    """엑셀 업로드 이력 모델"""
    __tablename__ = 'upload_history'
    
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    rows_processed = db.Column(db.Integer, default=0)
    rows_inserted = db.Column(db.Integer, default=0)
    rows_updated = db.Column(db.Integer, default=0)
    status = db.Column(db.Enum('처리중', '완료', '실패'), default='처리중')
    error_message = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'upload_date': self.upload_date.isoformat(),
            'rows_processed': self.rows_processed,
            'rows_inserted': self.rows_inserted,
            'rows_updated': self.rows_updated,
            'status': self.status,
            'error_message': self.error_message
        }

class DeletedOrderNumber(db.Model):
    """삭제된 고유번호 풀 (재사용을 위해)"""
    __tablename__ = 'deleted_order_numbers'
    
    id = db.Column(db.Integer, primary_key=True)
    order_no = db.Column(db.String(50), nullable=False, unique=True, index=True)
    manager_id = db.Column(db.Integer, db.ForeignKey('managers.id'), nullable=False)
    order_date = db.Column(db.Date, nullable=False, index=True)
    deleted_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<DeletedOrderNumber {self.order_no}>'

