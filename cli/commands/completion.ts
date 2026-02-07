/**
 * Completion command for Manifold CLI
 * Generates shell completion scripts for bash and zsh
 *
 * Satisfies: U4 (Shell completion support for feature names)
 */

import { Command } from 'commander';
import { findManifoldDir, listFeatures } from '../lib/parser.js';

// Bash completion script template
const BASH_COMPLETION = `# Manifold CLI bash completion
# Install: manifold completion bash > /etc/bash_completion.d/manifold
#      or: manifold completion bash >> ~/.bashrc

_manifold_completions() {
    local cur prev commands subcommands features
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"

    # Main commands
    commands="status validate init verify graph solve migrate show completion"

    # Commands that take feature names
    feature_commands="status validate verify graph solve migrate show"

    case "\${prev}" in
        manifold)
            COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
            return 0
            ;;
        status|validate|verify|graph|solve|migrate|show)
            # Get features from .manifold directory
            if [[ -d ".manifold" ]]; then
                features=$(ls .manifold/*.{json,yaml} 2>/dev/null | xargs -I{} basename {} | sed 's/\\.json$//;s/\\.yaml$//' | grep -v '\\.anchor$\\|\\.verify$\\|\\.integrate$' | sort -u)
                COMPREPLY=( $(compgen -W "\${features}" -- "\${cur}") )
            fi
            return 0
            ;;
        init)
            # init takes a new feature name, suggest templates
            COMPREPLY=( $(compgen -W "--template --outcome" -- "\${cur}") )
            return 0
            ;;
        completion)
            COMPREPLY=( $(compgen -W "bash zsh fish" -- "\${cur}") )
            return 0
            ;;
        --template)
            COMPREPLY=( $(compgen -W "auth crud payment api pm/feature-launch pm/experiment pm/deprecation pm/opportunity-assessment pm/product-vision pm/lean-canvas pm/pr-faq pm/mvp-definition pm/competitive-analysis pm/user-persona pm/go-to-market pm/product-roadmap pm/shape-up-pitch" -- "\${cur}") )
            return 0
            ;;
    esac

    # Handle flags
    case "\${cur}" in
        -*)
            case "\${COMP_WORDS[1]}" in
                status)
                    COMPREPLY=( $(compgen -W "--json --history --diff --graph --mermaid" -- "\${cur}") )
                    ;;
                validate)
                    COMPREPLY=( $(compgen -W "--json --strict --all --conflicts" -- "\${cur}") )
                    ;;
                verify)
                    COMPREPLY=( $(compgen -W "--json --actions --strict" -- "\${cur}") )
                    ;;
                init)
                    COMPREPLY=( $(compgen -W "--template --outcome --format" -- "\${cur}") )
                    ;;
                graph)
                    COMPREPLY=( $(compgen -W "--json --ascii --dot --mermaid" -- "\${cur}") )
                    ;;
                solve)
                    COMPREPLY=( $(compgen -W "--json --ascii --dot --mermaid --backward --target" -- "\${cur}") )
                    ;;
                migrate)
                    COMPREPLY=( $(compgen -W "--dry-run --force" -- "\${cur}") )
                    ;;
                show)
                    COMPREPLY=( $(compgen -W "--json --structure --content --validate --map --mermaid" -- "\${cur}") )
                    ;;
            esac
            return 0
            ;;
    esac
}

complete -F _manifold_completions manifold
`;

// Zsh completion script template
const ZSH_COMPLETION = `#compdef manifold
# Manifold CLI zsh completion
# Install: manifold completion zsh > ~/.zfunc/_manifold
#     and add: fpath=(~/.zfunc $fpath) && autoload -Uz compinit && compinit

_manifold() {
    local -a commands features
    local state

    commands=(
        'status:Show manifold status and next action'
        'validate:Validate manifold schema'
        'init:Initialize a new manifold'
        'verify:Verify artifacts against constraints'
        'graph:Display constraint graph'
        'solve:Generate execution plan'
        'migrate:Migrate YAML to JSON+MD format'
        'show:Show manifold content'
        'completion:Generate shell completions'
    )

    _arguments -C \\
        '1: :->command' \\
        '*: :->args' \\
        '--no-color[Disable colored output]' \\
        '--force-color[Force colored output]' \\
        '(-v --version)'{-v,--version}'[Show version]'

    case $state in
        command)
            _describe -t commands 'manifold commands' commands
            ;;
        args)
            case $words[2] in
                status|validate|verify|graph|solve|migrate|show)
                    _manifold_features
                    ;;
                init)
                    _arguments \\
                        '--template[Use template]:template:(auth crud payment api pm/feature-launch pm/experiment pm/deprecation pm/opportunity-assessment pm/product-vision pm/lean-canvas pm/pr-faq pm/mvp-definition pm/competitive-analysis pm/user-persona pm/go-to-market pm/product-roadmap pm/shape-up-pitch)' \\
                        '--outcome[Set outcome]:outcome:' \\
                        '--format[Output format]:format:(yaml json-md)' \\
                        '*:feature name:'
                    ;;
                completion)
                    _arguments '1:shell:(bash zsh fish)'
                    ;;
            esac
            ;;
    esac
}

_manifold_features() {
    local -a features
    if [[ -d ".manifold" ]]; then
        features=(\${(f)"$(ls .manifold/*.{json,yaml} 2>/dev/null | xargs -I{} basename {} | sed 's/\\.json$//;s/\\.yaml$//' | grep -v '\\.anchor$\\|\\.verify$\\|\\.integrate$' | sort -u)"})
        _describe -t features 'manifold features' features
    fi

    # Add command-specific flags
    case $words[2] in
        status)
            _arguments \\
                '--json[Output as JSON]' \\
                '--history[Show iteration history]' \\
                '--diff[Show changes since last iteration]' \\
                '--graph[Show constraint network graph]' \\
                '--mermaid[Output constraint network as Mermaid]'
            ;;
        validate)
            _arguments \\
                '--json[Output as JSON]' \\
                '--strict[Enable strict validation]' \\
                '--all[Show all errors/warnings]' \\
                '--conflicts[Check for conflicts between features]'
            ;;
        verify)
            _arguments \\
                '--json[Output as JSON]' \\
                '--actions[Show actionable fix commands]' \\
                '--strict[Enable strict verification]'
            ;;
        graph)
            _arguments \\
                '--json[Output as JSON]' \\
                '--ascii[ASCII art output]' \\
                '--dot[GraphViz DOT output]' \\
                '--mermaid[Raw Mermaid syntax output]'
            ;;
        solve)
            _arguments \\
                '--json[Output as JSON]' \\
                '--ascii[ASCII art output]' \\
                '--dot[GraphViz DOT output]' \\
                '--mermaid[Raw Mermaid syntax output]' \\
                '--backward[Backward reasoning mode]' \\
                '--target[Target node for backward reasoning]'
            ;;
        migrate)
            _arguments \\
                '--dry-run[Show what would be done]' \\
                '--force[Overwrite existing files]'
            ;;
        show)
            _arguments \\
                '--json[Output as JSON]' \\
                '--structure[Show only JSON structure]' \\
                '--content[Show only Markdown content]' \\
                '--validate[Include linking validation]' \\
                '--map[Show constraint relationship map]' \\
                '--mermaid[Output constraint map as Mermaid]'
            ;;
    esac
}

_manifold "$@"
`;

// Fish completion script template
const FISH_COMPLETION = `# Manifold CLI fish completion
# Install: manifold completion fish > ~/.config/fish/completions/manifold.fish

# Disable file completions for manifold
complete -c manifold -f

# Main commands
complete -c manifold -n "__fish_use_subcommand" -a "status" -d "Show manifold status"
complete -c manifold -n "__fish_use_subcommand" -a "validate" -d "Validate manifold schema"
complete -c manifold -n "__fish_use_subcommand" -a "init" -d "Initialize a new manifold"
complete -c manifold -n "__fish_use_subcommand" -a "verify" -d "Verify artifacts"
complete -c manifold -n "__fish_use_subcommand" -a "graph" -d "Display constraint graph"
complete -c manifold -n "__fish_use_subcommand" -a "solve" -d "Generate execution plan"
complete -c manifold -n "__fish_use_subcommand" -a "migrate" -d "Migrate YAML to JSON+MD"
complete -c manifold -n "__fish_use_subcommand" -a "show" -d "Show manifold content"
complete -c manifold -n "__fish_use_subcommand" -a "completion" -d "Generate shell completions"

# Global flags
complete -c manifold -l no-color -d "Disable colored output"
complete -c manifold -l force-color -d "Force colored output"
complete -c manifold -s v -l version -d "Show version"

# Feature name completions for commands that need them
function __manifold_features
    if test -d ".manifold"
        ls .manifold/*.json .manifold/*.yaml 2>/dev/null | xargs -I{} basename {} | sed 's/\\.json$//;s/\\.yaml$//' | grep -v '\\.anchor$\\|\\.verify$\\|\\.integrate$' | sort -u
    end
end

# Completions for commands that take feature names
complete -c manifold -n "__fish_seen_subcommand_from status validate verify graph solve migrate show" -a "(__manifold_features)" -d "Feature"

# Completion subcommand
complete -c manifold -n "__fish_seen_subcommand_from completion" -a "bash zsh fish" -d "Shell type"

# init command
complete -c manifold -n "__fish_seen_subcommand_from init" -l template -d "Use template" -a "auth crud payment api pm/feature-launch pm/experiment pm/deprecation pm/opportunity-assessment pm/product-vision pm/lean-canvas pm/pr-faq pm/mvp-definition pm/competitive-analysis pm/user-persona pm/go-to-market pm/product-roadmap pm/shape-up-pitch"
complete -c manifold -n "__fish_seen_subcommand_from init" -l outcome -d "Set outcome"
complete -c manifold -n "__fish_seen_subcommand_from init" -l format -d "Output format" -a "yaml json-md"

# status flags
complete -c manifold -n "__fish_seen_subcommand_from status" -l json -d "Output as JSON"
complete -c manifold -n "__fish_seen_subcommand_from status" -l history -d "Show iteration history"
complete -c manifold -n "__fish_seen_subcommand_from status" -l diff -d "Show changes"
complete -c manifold -n "__fish_seen_subcommand_from status" -l graph -d "Show constraint network graph"
complete -c manifold -n "__fish_seen_subcommand_from status" -l mermaid -d "Output constraint network as Mermaid"

# validate flags
complete -c manifold -n "__fish_seen_subcommand_from validate" -l json -d "Output as JSON"
complete -c manifold -n "__fish_seen_subcommand_from validate" -l strict -d "Strict validation"
complete -c manifold -n "__fish_seen_subcommand_from validate" -l all -d "Show all errors"
complete -c manifold -n "__fish_seen_subcommand_from validate" -l conflicts -d "Check conflicts"

# verify flags
complete -c manifold -n "__fish_seen_subcommand_from verify" -l json -d "Output as JSON"
complete -c manifold -n "__fish_seen_subcommand_from verify" -l actions -d "Show fix commands"
complete -c manifold -n "__fish_seen_subcommand_from verify" -l strict -d "Strict verification"

# graph flags
complete -c manifold -n "__fish_seen_subcommand_from graph" -l json -d "Output as JSON"
complete -c manifold -n "__fish_seen_subcommand_from graph" -l ascii -d "ASCII art output"
complete -c manifold -n "__fish_seen_subcommand_from graph" -l dot -d "GraphViz DOT output"
complete -c manifold -n "__fish_seen_subcommand_from graph" -l mermaid -d "Raw Mermaid syntax output"

# solve flags
complete -c manifold -n "__fish_seen_subcommand_from solve" -l json -d "Output as JSON"
complete -c manifold -n "__fish_seen_subcommand_from solve" -l ascii -d "ASCII art output"
complete -c manifold -n "__fish_seen_subcommand_from solve" -l dot -d "GraphViz DOT output"
complete -c manifold -n "__fish_seen_subcommand_from solve" -l mermaid -d "Raw Mermaid syntax output"
complete -c manifold -n "__fish_seen_subcommand_from solve" -l backward -d "Backward reasoning mode"
complete -c manifold -n "__fish_seen_subcommand_from solve" -l target -d "Target node for backward reasoning"

# migrate flags
complete -c manifold -n "__fish_seen_subcommand_from migrate" -l dry-run -d "Show what would be done"
complete -c manifold -n "__fish_seen_subcommand_from migrate" -l force -d "Overwrite existing"

# show flags
complete -c manifold -n "__fish_seen_subcommand_from show" -l json -d "Output as JSON"
complete -c manifold -n "__fish_seen_subcommand_from show" -l structure -d "Show only JSON structure"
complete -c manifold -n "__fish_seen_subcommand_from show" -l content -d "Show only Markdown content"
complete -c manifold -n "__fish_seen_subcommand_from show" -l validate -d "Include linking validation"
complete -c manifold -n "__fish_seen_subcommand_from show" -l map -d "Show constraint relationship map"
complete -c manifold -n "__fish_seen_subcommand_from show" -l mermaid -d "Output constraint map as Mermaid"
`;

/**
 * Register completion command
 */
export function registerCompletionCommand(program: Command): void {
  program
    .command('completion')
    .description('Generate shell completion scripts')
    .argument('[shell]', 'Shell type (bash, zsh, fish)', 'bash')
    .action((shell: string) => {
      switch (shell.toLowerCase()) {
        case 'bash':
          console.log(BASH_COMPLETION);
          break;
        case 'zsh':
          console.log(ZSH_COMPLETION);
          break;
        case 'fish':
          console.log(FISH_COMPLETION);
          break;
        default:
          console.error(`Unknown shell: ${shell}`);
          console.error('Supported shells: bash, zsh, fish');
          process.exit(1);
      }
    });

  // Also add a hidden command to list features (for dynamic completion helpers)
  program
    .command('list-features', { hidden: true })
    .description('List all feature names (for completion scripts)')
    .action(() => {
      const manifoldDir = findManifoldDir();
      if (manifoldDir) {
        const features = listFeatures(manifoldDir);
        features.forEach(f => console.log(f));
      }
    });
}
