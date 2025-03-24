export interface IPage<T> {
    data?: T,
    totalLength?: number,
    page?: number,
    limit?: number,
    accessToken?:string
}