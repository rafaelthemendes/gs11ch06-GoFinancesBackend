import { Router } from 'express';
import multer from 'multer';
import { getCustomRepository } from 'typeorm';
import uploadConfig from '../config/upload.config';
import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from '../services/CreateTransactionService';
import ImportTransactionsService from '../services/ImportTransactionsService';

const uploadMiddleware = multer(uploadConfig);
const transactionsRouter = Router();

transactionsRouter.get('/', async (request, response) => {
  const transactionsRepository = getCustomRepository(TransactionsRepository);
  const transactions = await transactionsRepository.find();
  const balance = await transactionsRepository.getBalance();
  return response.json({ transactions, balance });
});

transactionsRouter.post('/', async (request, response) => {
  const { title, value, type, category } = request.body;
  const transaction = await new CreateTransactionService().execute({
    title,
    value,
    type,
    categoryTitle: category,
  });
  return response.json(transaction);
});

transactionsRouter.delete('/:id', async (request, response) => {
  const { id } = request.params;
  const transactionsRepository = getCustomRepository(TransactionsRepository);
  await transactionsRepository.delete(id);
  return response.status(204).send();
});

transactionsRouter.post(
  '/import',
  uploadMiddleware.single('transactions'),
  async (request, response) => {
    const transactions = await new ImportTransactionsService().execute(
      request.file.path,
    );
    return response.json(transactions);
  },
);

export default transactionsRouter;
