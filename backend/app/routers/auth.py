"""
Роутер для авторизации
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, RegisterRequest, LoginResponse, ReferralCodeResponse, ReferralsListResponse, UserMeResponse
from app.auth import verify_password, get_password_hash, create_access_token, get_current_user
import uuid
import secrets
import string

router = APIRouter(prefix="/auth", tags=["auth"])


def generate_referral_code(db: Session, length: int = 8) -> str:
    """
    Генерирует уникальный реферальный код.
    Использует буквы и цифры, исключая похожие символы (0, O, 1, I, l).
    """
    alphabet = string.ascii_uppercase.replace('O', '').replace('I', '') + string.digits.replace('0', '').replace('1', '')
    
    max_attempts = 100
    for _ in range(max_attempts):
        code = ''.join(secrets.choice(alphabet) for _ in range(length))
        # Проверяем уникальность
        existing = db.query(User).filter(User.referral_code == code).first()
        if not existing:
            return code
    
    # Если не удалось сгенерировать за 100 попыток, используем UUID
    return str(uuid.uuid4())[:length].upper().replace('-', '')


@router.post("/register", response_model=LoginResponse)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Регистрация нового пользователя"""
    # Проверяем, существует ли пользователь
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует"
        )
    
    # Обрабатываем реферальный код, если он указан
    referred_by_id = None
    if request.referral_code:
        referral_code = request.referral_code.strip().upper()
        referrer = db.query(User).filter(User.referral_code == referral_code).first()
        if not referrer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Реферальный код не найден"
            )
        referred_by_id = referrer.id
    
    # Генерируем уникальный реферальный код для нового пользователя
    referral_code = generate_referral_code(db)
    
    # Создаём нового пользователя
    user = User(
        id=uuid.uuid4(),
        email=request.email,
        hashed_password=get_password_hash(request.password),
        referral_code=referral_code,
        referred_by_id=referred_by_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Создаём токен
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return LoginResponse(
        token=access_token,
        user={"id": user.id, "email": user.email}
    )


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Вход в систему"""
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль"
        )
    
    # Создаём токен
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return LoginResponse(
        token=access_token,
        user={"id": user.id, "email": user.email}
    )


@router.get("/me", response_model=UserMeResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Получить дату регистрации текущего пользователя"""
    return UserMeResponse(created_at=current_user.created_at)


@router.get("/my-referral-code", response_model=ReferralCodeResponse)
async def get_my_referral_code(current_user: User = Depends(get_current_user)):
    """Получить свой реферальный код"""
    if not current_user.referral_code:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Реферальный код не найден"
        )
    return ReferralCodeResponse(referral_code=current_user.referral_code)


@router.get("/my-referrals", response_model=ReferralsListResponse)
async def get_my_referrals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить список пользователей, которых пригласил текущий пользователь"""
    referrals = db.query(User).filter(User.referred_by_id == current_user.id).order_by(User.created_at.desc()).all()
    
    return ReferralsListResponse(
        referrals=[
            {
                "id": ref.id,
                "email": ref.email,
                "created_at": ref.created_at
            }
            for ref in referrals
        ],
        total_count=len(referrals)
    )
