import type { Disposable } from 'vscode';
import { CancellationError } from '../errors';
import type { Deferred } from './promise';
import { defer } from './promise';

interface Task<T> {
	(): T;
}

export class Debouncer<T = void> implements Disposable {
	private deferred: Deferred<T | undefined> | undefined;
	private task: Task<T | Promise<T>> | undefined;
	private timer: ReturnType<typeof setTimeout> | undefined;

	constructor(public readonly defaultDelay: number) {}

	dispose(): void {
		this.cancelTimeout();
	}

	debounce(task: Task<T | Promise<T>>, delay: number = this.defaultDelay): Promise<T | undefined> {
		this.task = task;
		this.cancelTimeout();

		if (this.deferred == null) {
			this.deferred = defer<T | undefined>();
		}

		this.timer = setTimeout(async () => {
			this.timer = undefined;
			if (this.deferred == null) return;

			const task = this.task;
			this.task = undefined;

			const result = await task?.();
			this.deferred?.fulfill(result);
		}, delay);

		return this.deferred.promise;
	}

	cancel(): void {
		this.cancelTimeout();

		this.deferred?.cancel(new CancellationError());
		this.deferred = undefined;
	}

	private cancelTimeout(): void {
		if (this.timer != null) {
			clearTimeout(this.timer);
			this.timer = undefined;
		}
	}
}
