import "dotenv/config";
import app from "../src/app";

export default function handler(req: any, res: any) {
	return app(req, res);
}