import { test } from '@playwright/test';
import UITable from './webTable';

test.setTimeout(1200000);

test('has title3', async ({ page }) => {
  await page.goto('https://mdbasheer333.github.io/equalitydemosite/#table2');
  console.log('inside docker shard3');  
  const table = await UITable.create({ page: page, uniqueColumnName: 'Country', tableIndex: 3 });

  console.log(await table.getAllData());
  console.log(await table.getRowCount());
  console.log(table.getColumns());
  console.log(table.getColumnCount());
  console.log(await table.getDataOfRow(1));
  console.log(await table.getDataOfCell(1, 3));
  console.log(await table.getDataOfCell(1, 'Country'));
  console.log(table.getColumnPosition('Country'));

  // await table.setCheckboxInCell(2,'Select');
  // await table.setCheckboxInCell(5,'Select');
  await table.clickButtonInCell(1, 'Action', 'Delete');
  await table.clickButtonInCell(5, 'Action', 'Delete');

  await page.waitForTimeout(2000);

});
