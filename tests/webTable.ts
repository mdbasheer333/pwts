import { FrameLocator, Locator, Page } from "@playwright/test";

type UITableDetails = {
    page: Page;
    uniqueColumnName: string;
    tableIndex?: number;
    frameLoc?: string;
};

type TableColumn = number | string;
type CellControlType = 'text' | 'link' | 'button' | 'checkbox' | 'radio' | 'dropdown' | 'input';

export default class UITable {
    private tableLoc!: Locator;
    private headersList: string[] = [];
    private bodyHeaderRowCount = 0;

    constructor(private readonly details: UITableDetails) { }

    static async create(details: UITableDetails): Promise<UITable> {
        const table = new UITable(details);
        await table.init();
        return table;
    }

    async init(): Promise<void> {
        const { page, uniqueColumnName, tableIndex = 1, frameLoc } = this.details;
        const root: Page | FrameLocator = frameLoc ? page.frameLocator(frameLoc) : page;
        const headerXpath = `//*[self::th or self::td][normalize-space(.)=${xpathString(uniqueColumnName)}]`;
        const columnHeader = root.locator(`xpath=${headerXpath}`).nth(tableIndex - 1);

        await columnHeader.waitFor({ state: 'visible' });
        this.tableLoc = columnHeader.locator('xpath=ancestor::table[1]');
        this.headersList = await this.tableLoc
            .locator('xpath=./thead/tr[1]/*[self::th or self::td]')
            .allInnerTexts();

        if (this.headersList.length === 0) {
            this.headersList = await this.tableLoc
                .locator('xpath=./tbody/tr[1]/*[self::th or self::td]')
                .allInnerTexts();
            this.bodyHeaderRowCount = 1;
        }

        this.headersList = this.headersList.map((header) => header.trim());
    }

    async getAllData(): Promise<Record<string, string>[]> {
        const rowCount = await this.getRowCount();
        const data: Record<string, string>[] = [];

        for (let rowNum = 1; rowNum <= rowCount; rowNum++) {
            data.push(await this.getDataOfRow(rowNum));
        }

        return data;
    }

    async getRowCount(): Promise<number> {
        return await this.getRows().count();
    }

    getColumns(): string[] {
        return [...this.headersList];
    }

    getColumnCount(): number {
        return this.headersList.length;
    }

    async getDataOfRow(rowNum: number): Promise<Record<string, string>> {
        this.validateRowNumber(rowNum);

        const rowData: Record<string, string> = {};
        for (let index = 0; index < this.headersList.length; index++) {
            rowData[this.headersList[index]] = await this.getCellValue(rowNum, index + 1);
        }

        return rowData;
    }

    async getDataOfCell(rowNum: number, columnNum: number): Promise<string>;
    async getDataOfCell(rowNum: number, columnName: string): Promise<string>;
    async getDataOfCell(rowNum: number, column: number | string): Promise<string> {
        return (await this.getCellLocator(rowNum, column).innerText()).trim();
    }

    getCellLocator(rowNum: number, column: TableColumn): Locator {
        this.validateRowNumber(rowNum);

        const columnPosition = this.resolveColumnPosition(column);
        return this.getRows()
            .nth(rowNum - 1)
            .locator(`xpath=./*[self::th or self::td][${columnPosition}]`);
    }

    async getCellValue(rowNum: number, column: TableColumn): Promise<string> {
        const cell = this.getCellLocator(rowNum, column);

        const dropdown = await this.getSingleControlIfPresent(cell.locator('select'), 'dropdown', rowNum, column);
        if (dropdown) {
            return (await dropdown.locator('option:checked').innerText()).trim();
        }

        const checkbox = await this.getSingleControlIfPresent(cell.locator('input[type="checkbox"]'), 'checkbox', rowNum, column);
        if (checkbox) {
            return await checkbox.isChecked() ? 'checked' : 'unchecked';
        }

        const radio = await this.getSingleControlIfPresent(cell.locator('input[type="radio"]'), 'radio', rowNum, column);
        if (radio) {
            return await radio.isChecked() ? 'checked' : 'unchecked';
        }

        const input = await this.getSingleControlIfPresent(
            cell.locator('input:not([type]), input[type="text"], input[type="email"], input[type="password"], input[type="number"], textarea'),
            'input',
            rowNum,
            column
        );
        if (input) {
            return (await input.inputValue()).trim();
        }

        const link = await this.getSingleControlIfPresent(cell.locator('a'), 'link', rowNum, column);
        if (link) {
            return (await link.innerText()).trim();
        }

        const button = await this.getSingleControlIfPresent(
            cell.locator('button, input[type="button"], input[type="submit"], input[type="reset"]'),
            'button',
            rowNum,
            column
        );
        if (button) {
            return ((await button.innerText()).trim() || (await button.getAttribute('value'))?.trim() || '');
        }

        return (await cell.innerText()).trim();
    }

    async getCellControlTypes(rowNum: number, column: TableColumn): Promise<CellControlType[]> {
        const cell = this.getCellLocator(rowNum, column);
        const controlChecks: { type: CellControlType; locator: Locator }[] = [
            { type: 'link', locator: cell.locator('a') },
            { type: 'button', locator: cell.locator('button, input[type="button"], input[type="submit"], input[type="reset"]') },
            { type: 'checkbox', locator: cell.locator('input[type="checkbox"]') },
            { type: 'radio', locator: cell.locator('input[type="radio"]') },
            { type: 'dropdown', locator: cell.locator('select') },
            { type: 'input', locator: cell.locator('input:not([type]), input[type="text"], input[type="email"], input[type="password"], input[type="number"], textarea') },
        ];
        const types: CellControlType[] = [];

        for (const check of controlChecks) {
            if (await check.locator.count() > 0) {
                types.push(check.type);
            }
        }

        return types.length > 0 ? types : ['text'];
    }

    async clickButtonInCell(rowNum: number, column: TableColumn, buttonName?: string): Promise<void> {
        const cell = this.getCellLocator(rowNum, column);
        const button = buttonName
            ? cell.getByRole('button', { name: buttonName })
            : cell.getByRole('button');

        await this.clickSingleControl(button, buttonName ? `button "${buttonName}"` : 'button', rowNum, column);
    }

    async clickLinkInCell(rowNum: number, column: TableColumn, linkName?: string): Promise<void> {
        const cell = this.getCellLocator(rowNum, column);
        const link = linkName
            ? cell.getByRole('link', { name: linkName })
            : cell.getByRole('link');

        await this.clickSingleControl(link, linkName ? `link "${linkName}"` : 'link', rowNum, column);
    }

    async getLinkHrefInCell(rowNum: number, column: TableColumn, linkName?: string): Promise<string> {
        const cell = this.getCellLocator(rowNum, column);
        const link = linkName
            ? cell.getByRole('link', { name: linkName })
            : cell.getByRole('link');

        await this.ensureSingleControl(link, linkName ? `link "${linkName}"` : 'link', rowNum, column);
        return await link.getAttribute('href') ?? '';
    }

    async setCheckboxInCell(rowNum: number, column: TableColumn, checked = true): Promise<void> {
        const checkbox = this.getCellLocator(rowNum, column).locator('input[type="checkbox"]');
        await this.ensureSingleControl(checkbox, 'checkbox', rowNum, column);
        await checkbox.setChecked(checked);
    }

    async isCheckboxCheckedInCell(rowNum: number, column: TableColumn): Promise<boolean> {
        const checkbox = this.getCellLocator(rowNum, column).locator('input[type="checkbox"]');
        await this.ensureSingleControl(checkbox, 'checkbox', rowNum, column);
        return await checkbox.isChecked();
    }

    async selectDropdownInCell(rowNum: number, column: TableColumn, option: string): Promise<void> {
        const dropdown = this.getCellLocator(rowNum, column).locator('select');
        await this.ensureSingleControl(dropdown, 'dropdown', rowNum, column);
        await dropdown.selectOption({ label: option });
    }

    getColumnPosition(columnName: string): number {
        const position = this.headersList.findIndex(
            (header) => header === columnName.trim()
        );

        if (position === -1) {
            throw new Error(`Column "${columnName}" was not found. Available columns: ${this.headersList.join(', ')}`);
        }

        return position + 1;
    }

    private resolveColumnPosition(column: TableColumn): number {
        const columnPosition = typeof column === 'number'
            ? column
            : this.getColumnPosition(column);

        this.validateColumnNumber(columnPosition);
        return columnPosition;
    }

    private getRows(): Locator {
        return this.tableLoc.locator(`xpath=./tbody/tr[position()>${this.bodyHeaderRowCount}]`);
    }

    private validateRowNumber(rowNum: number): void {
        if (!Number.isInteger(rowNum) || rowNum < 1) {
            throw new Error(`Row number must be a positive integer. Received: ${rowNum}`);
        }
    }

    private validateColumnNumber(columnNum: number): void {
        if (!Number.isInteger(columnNum) || columnNum < 1 || columnNum > this.getColumnCount()) {
            throw new Error(`Column number must be between 1 and ${this.getColumnCount()}. Received: ${columnNum}`);
        }
    }

    private async getSingleControlIfPresent(
        control: Locator,
        controlName: string,
        rowNum: number,
        column: TableColumn
    ): Promise<Locator | undefined> {
        const count = await control.count();
        if (count === 0) {
            return undefined;
        }

        if (count > 1) {
            throw this.multipleControlsError(controlName, rowNum, column, count);
        }

        return control;
    }

    private async clickSingleControl(
        control: Locator,
        controlName: string,
        rowNum: number,
        column: TableColumn
    ): Promise<void> {
        await this.ensureSingleControl(control, controlName, rowNum, column);
        await control.click();
    }

    private async ensureSingleControl(
        control: Locator,
        controlName: string,
        rowNum: number,
        column: TableColumn
    ): Promise<void> {
        const count = await control.count();
        if (count === 0) {
            throw new Error(`No ${controlName} found in row ${rowNum}, column ${this.columnLabel(column)}.`);
        }

        if (count > 1) {
            throw this.multipleControlsError(controlName, rowNum, column, count);
        }
    }

    private multipleControlsError(
        controlName: string,
        rowNum: number,
        column: TableColumn,
        count: number
    ): Error {
        return new Error(
            `Found ${count} ${controlName} controls in row ${rowNum}, column ${this.columnLabel(column)}. ` +
            `Pass a visible name where supported, or use getCellLocator(row, column) for custom handling.`
        );
    }

    private columnLabel(column: TableColumn): string {
        return typeof column === 'number' ? `${column}` : `"${column}"`;
    }
}

function xpathString(value: string): string {
    if (!value.includes("'")) {
        return `'${value}'`;
    }

    if (!value.includes('"')) {
        return `"${value}"`;
    }

    return `concat(${value.split("'").map((part) => `'${part}'`).join(`, "'", `)})`;
}
