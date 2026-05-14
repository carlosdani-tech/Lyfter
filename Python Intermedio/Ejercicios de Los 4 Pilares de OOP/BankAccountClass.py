class BankAccount:

    def __init__(self, balance):
        self.balance = balance


    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("Deposit amount must be greater than 0")

        self.balance = self.balance + amount


    def withdraw(self, amount):
        if amount <= 0:
            raise ValueError("Withdraw amount must be greater than 0")

        if amount > self.balance:
            raise ValueError("Not enough balance")

        self.balance = self.balance - amount


class SavingsAccount(BankAccount):

    def __init__(self, balance, min_balance):
        super().__init__(balance)
        self.min_balance = min_balance


    def withdraw(self, amount):
        if amount <= 0:
            raise ValueError("Withdraw amount must be greater than 0")

        if self.balance - amount < self.min_balance:
            raise ValueError("Cannot withdraw. Balance would be below minimum balance")

        self.balance = self.balance - amount


account = SavingsAccount(1000, 200)

account.deposit(300)
print("Balance:", account.balance)

account.withdraw(500)
print("Balance:", account.balance)

# Esta línea daría error porque deja el balance debajo del mínimo
# account.withdraw(700)