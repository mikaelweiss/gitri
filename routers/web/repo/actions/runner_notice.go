// Copyright 2026 The Gitea Authors. All rights reserved.
// SPDX-License-Identifier: MIT

package actions

import (
	"context"
	"maps"
	"slices"
	"strings"

	actions_model "gitea.dev/models/actions"
	"gitea.dev/models/db"
	"gitea.dev/modules/container"
	"gitea.dev/modules/optional"
	"gitea.dev/modules/util"
	context_module "gitea.dev/services/context"
)

// maxRunnerNoticeJobs bounds the list page query. Stalled jobs are the oldest in the queue,
// so they sort first, and past this limit the run count in the notice understates.
const maxRunnerNoticeJobs = 500

// RunnerNotice explains that waiting jobs cannot start because no runner can pick them up.
type RunnerNotice struct {
	Message     string `json:"message"`
	RunnersLink string `json:"runnersLink,omitempty"` // empty when the viewer cannot manage runners
	LinkText    string `json:"linkText,omitempty"`
}

func findUsableRunners(ctx context.Context, repoID int64) ([]*actions_model.ActionRunner, error) {
	return db.Find[actions_model.ActionRunner](ctx, actions_model.FindRunnerOptions{
		RepoID:        repoID,
		IsOnline:      optional.Some(true),
		IsDisabled:    optional.Some(false),
		WithAvailable: true,
	})
}

// findRunnerlessJobs returns the waiting jobs no runner can pick up.
// A job a busy runner matches is not included, it starts once that runner is free.
func findRunnerlessJobs(jobs []*actions_model.ActionRunJob, runners []*actions_model.ActionRunner) []*actions_model.ActionRunJob {
	var runnerless []*actions_model.ActionRunJob
	for _, job := range jobs {
		if !job.Status.IsWaiting() || job.IsReusableCaller {
			continue
		}
		canRun := slices.ContainsFunc(runners, func(runner *actions_model.ActionRunner) bool {
			return runner.CanMatchLabels(job.RunsOn)
		})
		if !canRun {
			runnerless = append(runnerless, job)
		}
	}
	return runnerless
}

func joinRunnerLabels(jobs []*actions_model.ActionRunJob) string {
	labels := make(container.Set[string])
	for _, job := range jobs {
		labels.AddMultiple(job.RunsOn...)
	}
	return strings.Join(slices.Sorted(maps.Keys(labels)), ", ")
}

func newRunnerNotice(ctx *context_module.Context, message string) *RunnerNotice {
	notice := &RunnerNotice{Message: message}
	if ctx.Repo.Permission.IsAdmin() {
		notice.RunnersLink = ctx.Repo.RepoLink + "/settings/actions/runners"
		notice.LinkText = ctx.Locale.TrString("actions.runs.manage_runners")
	}
	return notice
}

// newRepoRunnerNotice covers the queue of the whole repository, not only the runs on the current page.
func newRepoRunnerNotice(ctx *context_module.Context, runners []*actions_model.ActionRunner) (*RunnerNotice, error) {
	opts := actions_model.JobQueueOptions{RepoID: ctx.Repo.Repository.ID, Status: actions_model.StatusWaiting}
	jobs, _, err := actions_model.FindJobQueueJobs(ctx, opts, 1, maxRunnerNoticeJobs)
	if err != nil {
		return nil, err
	}
	runnerless := findRunnerlessJobs(jobs, runners)
	if len(runnerless) == 0 {
		return nil, nil
	}

	runIDs := make(container.Set[int64])
	for _, job := range runnerless {
		runIDs.Add(job.RunID)
	}
	isSingular := len(runIDs) == 1
	if len(runners) == 0 {
		key := util.Iif(isSingular, "actions.runs.no_runner_for_runs_1", "actions.runs.no_runner_for_runs_n")
		return newRunnerNotice(ctx, ctx.Locale.TrString(key, len(runIDs))), nil
	}
	key := util.Iif(isSingular, "actions.runs.no_matching_runner_for_runs_1", "actions.runs.no_matching_runner_for_runs_n")
	return newRunnerNotice(ctx, ctx.Locale.TrString(key, len(runIDs), joinRunnerLabels(runnerless))), nil
}

func newRunRunnerNotice(ctx *context_module.Context, jobs []*actions_model.ActionRunJob) (*RunnerNotice, error) {
	isWaiting := func(job *actions_model.ActionRunJob) bool { return job.Status.IsWaiting() }
	if !slices.ContainsFunc(jobs, isWaiting) {
		return nil, nil
	}
	runners, err := findUsableRunners(ctx, ctx.Repo.Repository.ID)
	if err != nil {
		return nil, err
	}
	runnerless := findRunnerlessJobs(jobs, runners)
	switch {
	case len(runnerless) == 0:
		return nil, nil
	case len(runners) == 0:
		return newRunnerNotice(ctx, ctx.Locale.TrString("actions.runs.no_runner_for_run")), nil
	default:
		return newRunnerNotice(ctx, ctx.Locale.TrString("actions.runs.no_matching_runner_for_run", joinRunnerLabels(runnerless))), nil
	}
}
