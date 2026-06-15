from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False, unique=True)
    username = Column(String(50), nullable=False, unique=True)

    addresses = relationship(
        "Address",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    cars = relationship(
        "Car",
        back_populates="user"
    )

    def __repr__(self):
        return f"<User(user_id={self.user_id}, full_name='{self.full_name}')>"


class Address(Base):
    __tablename__ = "addresses"

    address_id = Column(Integer, primary_key=True, autoincrement=True)
    province = Column(String(100), nullable=False)
    canton = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    exact_address = Column(String(255), nullable=False)

    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)

    user = relationship(
        "User",
        back_populates="addresses"
    )

    def __repr__(self):
        return f"<Address(address_id={self.address_id}, province='{self.province}')>"


class Car(Base):
    __tablename__ = "cars"

    car_id = Column(Integer, primary_key=True, autoincrement=True)
    brand = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    manufacture_year = Column(Integer, nullable=False)
    car_status = Column(String(30), nullable=False)

    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)

    user = relationship(
        "User",
        back_populates="cars"
    )

    def __repr__(self):
        return f"<Car(car_id={self.car_id}, brand='{self.brand}', model='{self.model}')>"