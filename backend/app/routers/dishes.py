"""
Роутер для блюд
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User, Dish
from app.schemas import DishCreate, DishResponse
from app.auth import get_current_user
from app.utils_id import parse_id


router = APIRouter(prefix="/dishes", tags=["dishes"])


@router.get("", response_model=List[DishResponse])
async def get_all_dishes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить все блюда пользователя"""
    dishes = db.query(Dish).filter(
        Dish.user_id == current_user.id
    ).order_by(Dish.created_at.desc()).all()
    return dishes


@router.get("/{dish_id}", response_model=DishResponse)
async def get_dish(
    dish_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить блюдо по ID (UUID или строка с фронта, например timestamp)"""
    dish_uuid = parse_id("dish", dish_id)
    dish = db.query(Dish).filter(
        Dish.id == dish_uuid,
        Dish.user_id == current_user.id
    ).first()
    
    if not dish:
        raise HTTPException(status_code=404, detail="Блюдо не найдено")
    
    return dish


@router.put("/{dish_id}", response_model=DishResponse)
async def save_dish(
    dish_id: str,
    dish_data: DishCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создать или обновить блюдо (dish_id — UUID или строка с фронта, например timestamp)"""
    dish_uuid = parse_id("dish", dish_id)
    dish = db.query(Dish).filter(
        Dish.id == dish_uuid,
        Dish.user_id == current_user.id
    ).first()
    
    if dish:
        # Обновляем существующее
        dish.name = dish_data.name
        dish.calories = dish_data.calories
        dish.protein = dish_data.protein
        dish.fats = dish_data.fats
        dish.carbs = dish_data.carbs
    else:
        # Создаём новое
        dish = Dish(
            id=dish_uuid,
            user_id=current_user.id,
            **dish_data.model_dump()
        )
        db.add(dish)
    
    db.commit()
    db.refresh(dish)
    return dish


@router.delete("/{dish_id}")
async def delete_dish(
    dish_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Удалить блюдо (dish_id — UUID или строка с фронта)"""
    dish_uuid = parse_id("dish", dish_id)
    dish = db.query(Dish).filter(
        Dish.id == dish_uuid,
        Dish.user_id == current_user.id
    ).first()
    
    if not dish:
        raise HTTPException(status_code=404, detail="Блюдо не найдено")
    
    db.delete(dish)
    db.commit()
    return {"message": "Блюдо удалено"}
