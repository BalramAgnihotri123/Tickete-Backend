export interface IResponse<T = void> {
    statusCode: number,
    error?: string,
    message?: string,
    data?: T
};