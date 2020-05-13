import csvParse from 'csv-parse';
import fs from 'fs';
import { getCustomRepository, getRepository, In } from 'typeorm';
import AppError from '../errors/AppError';
import Category from '../models/Category';
import Transaction, { TransactionType } from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: TransactionType;
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionsCsv: CSVTransaction[] = [];
    const categoryTitles: string[] = [];
    let totalValue = 0;

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParse({ from_line: 2 }))
        .on('data', row => {
          try {
            const [titleCell, typeCell, valueCell, categoryCell] = row;

            const title = titleCell.trim();
            const type = typeCell.trim();
            const value = Number(valueCell.trim());
            const category = categoryCell.trim();

            transactionsCsv.push({ title, type, category, value });
            categoryTitles.push(category);

            if (type === 'income') {
              totalValue += value;
            } else {
              totalValue -= value;
            }
          } catch (error) {
            reject(new AppError('Invalid content in file'));
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const balance = await transactionsRepository.getBalance();
    if (balance.total + totalValue < 0) {
      throw new AppError("Insuficient funds. File entries weren't loaded");
    }

    const categoriesRepository = getRepository(Category);
    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categoryTitles),
      },
    });

    const existentCategoryTitles = existentCategories.map(
      category => category.title,
    );
    const categoryTitlesToCreate = Array.from(
      new Set(
        categoryTitles.filter(
          categoryTitle => !existentCategoryTitles.includes(categoryTitle),
        ),
      ),
    ).map(categoryTitle => ({ title: categoryTitle }));

    const newCategories = categoriesRepository.create(categoryTitlesToCreate);
    await categoriesRepository.save(newCategories);

    const allCategories = [...existentCategories, ...newCategories];

    const transactionsToAdd = transactionsCsv.map(transactionCsv => ({
      ...transactionCsv,
      category: allCategories.find(
        category => category.title === transactionCsv.category,
      ),
    }));

    const transactions = transactionsRepository.create(transactionsToAdd);
    await transactionsRepository.save(transactions);

    await fs.promises.unlink(filePath);

    return transactions;
  }
}

export default ImportTransactionsService;
