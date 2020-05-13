import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';
import Category from '../models/Category';
import Transaction, { TransactionType } from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: TransactionType;
  categoryTitle: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    categoryTitle,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    if (!Object.values(TransactionType).includes(type)) {
      throw new AppError(`Invalid type ${type}`);
    }

    if (type === 'outcome') {
      const { total } = await transactionsRepository.getBalance();
      if (value > total) {
        throw new AppError('Insuficient funds');
      }
    }

    const categoriesRepository = getRepository(Category);
    let category = await categoriesRepository.findOne({
      where: {
        title: categoryTitle,
      },
    });
    if (!category) {
      category = categoriesRepository.create({ title: categoryTitle });
      await categoriesRepository.save(category);
    }

    const transaction = transactionsRepository.create({
      title,
      type,
      value,
      category,
    });
    await transactionsRepository.save(transaction);
    return transaction;
  }
}

export default CreateTransactionService;
